var expect;

expect = require("expect.js");

describe("Corser", function () {

    var corser, req, res;

    beforeEach(function () {
        corser = require("../lib/corser");
        // Prepare mocks.
        req = {
            headers: {}
        };
        res = {
            setHeader: function (name, value) {
                this.headers[name.toLowerCase()] = value;
            },
            headers: {},
            writeHead: function (status) {
                this.status = status;
            },
            status: null,
            end: function () {
                this.ended = true;
            },
            ended: false
        };
    });

    it("should not add any headers if the \"Origin\" header is not present in the request", function (done) {
        var requestListener;
        requestListener = corser.create();
        requestListener(req, res, function () {
            expect(Object.keys(res.headers).length).to.equal(0);
            done();
        });
    });

    it("should not add any headers if the given origin does not match one of the origins in the list of origins", function (done) {
        var requestListener, origins;
        origins = ["example.com"];
        // Test with array.
        requestListener = corser.create({
            origins: origins
        });
        req.headers["origin"] = "fake.com";
        requestListener(req, res, function () {
            expect(Object.keys(res.headers).length).to.equal(0);
            // Test with function.
            requestListener = corser.create({
                origins: function (originHeader, callback) {
                    callback(null, origins.indexOf(originHeader) !== -1);
                }
            });
            requestListener(req, res, function () {
                expect(Object.keys(res.headers).length).to.equal(0);
                done();
            });
        });
    });

    it("should support passing a function as origins and it should work both synchronously and asynchronously", function (done) {
        var requestListener, origins;
        origins = ["example.com"];
        // Test with asynchronous function.
        requestListener = corser.create({
            origins: function (originHeader, callback) {
                process.nextTick(function() {
                    callback(null, origins.indexOf(originHeader) !== -1);
                });
            }
        });
        req.headers["origin"] = "fake.com";
        requestListener(req, res, function () {
            expect(Object.keys(res.headers).length).to.equal(0);
            req.headers["origin"] = "example.com";
            requestListener(req, res, function () {
                expect(Object.keys(res.headers).length).to.equal(1);
                // Test with synchronous function.
                requestListener = corser.create({
                    origins: function (originHeader, callback) {
                        callback(null, origins.indexOf(originHeader) !== -1);
                    }
                });
                res.headers = {};
                requestListener(req, res, function () {
                    expect(Object.keys(res.headers).length).to.equal(1);
                    req.headers["origin"] = "fake.com";
                    res.headers = {};
                    requestListener(req, res, function () {
                        expect(Object.keys(res.headers).length).to.equal(0);
                        done();
                    });
                });
            });
        });
    });

    it("should not accept any non-boolean value as the second parameter of an match origin callback", function (done) {
        var requestListener;
        req.headers["origin"] = "example.com";
        // Test undefined.
        requestListener = corser.create({
            origins: function (originHeader, callback) {
                callback(null);
            }
        });
        requestListener(req, res, function () {
            expect(Object.keys(res.headers).length).to.equal(0);
            // Test null.
            requestListener = corser.create({
                origins: function (originHeader, callback) {
                    callback(null, null);
                }
            });
            requestListener(req, res, function () {
                expect(Object.keys(res.headers).length).to.equal(0);
                // Test number.
                requestListener = corser.create({
                    origins: function (originHeader, callback) {
                        callback(null, 4711);
                    }
                });
                requestListener(req, res, function () {
                    expect(Object.keys(res.headers).length).to.equal(0);
                    // Test string.
                    requestListener = corser.create({
                        origins: function (originHeader, callback) {
                            callback(null, "test");
                        }
                    });
                    requestListener(req, res, function () {
                        expect(Object.keys(res.headers).length).to.equal(0);
                        done();
                    });
                });
            });
        });
    });

    it("should expose errors encountered in the match origin callback", function (done) {
        var requestListener;
        requestListener = corser.create({
            origins: function (originHeader, callback) {
                callback({
                    message: "Something went wrong!",
                    status: 500
                });
            }
        });
        req.headers["origin"] = "example.com";
        requestListener(req, res, function (err) {
            expect(err).to.not.be(undefined);
            done();
        });
    });

    it("should not add any headers if the given origin is not a case-sentitive match of one of the origins in the list of origins", function (done) {
        var requestListener;
        requestListener = corser.create({
            origins: ["example.com"]
        });
        req.headers["origin"] = "eXaMpLe.cOm";
        requestListener(req, res, function () {
            expect(Object.keys(res.headers).length).to.equal(0);
            done();
        });
    });

    describe("An actual request", function () {

        it("should add an Access-Control-Allow-Origin header of \"*\" for any given origin if the list of origins in unbound", function (done) {
            var requestListener;
            requestListener = corser.create();
            req.headers["origin"] = "example.org";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("*");
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header of \"example.com\" if the given origin matches one of the origins in the list of origins", function (done) {
            var requestListener;
            requestListener = corser.create({
                origins: ["example.com"]
            });
            req.headers["origin"] = "example.com";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("example.com");
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header of \"example.com\" and an Access-Control-Allow-Credentials header of \"true\" if credentials are supported and the list of origins in unbound", function (done) {
            var requestListener;
            requestListener = corser.create({
                supportsCredentials: true
            });
            req.headers["origin"] = "example.com";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("example.com");
                expect(res.headers["access-control-allow-credentials"]).to.equal("true");
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header of \"example.com\" and an Access-Control-Allow-Credentials header of \"true\" if credentials are supported and the given origin matches one of the origins in the list of origins", function (done) {
            var requestListener, origins;
            origins = ["example.com"];
            // Test with array.
            requestListener = corser.create({
                origins: origins,
                supportsCredentials: true
            });
            req.headers["origin"] = "example.com";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("example.com");
                expect(res.headers["access-control-allow-credentials"]).to.equal("true");
                // Test with function.
                requestListener = corser.create({
                    origins: function (origin, callback) {
                        callback(null, origins.indexOf(origin) !== -1);
                    },
                    supportsCredentials: true
                });
                res.headers = {};
                requestListener(req, res, function () {
                    expect(res.headers["access-control-allow-origin"]).to.equal("example.com");
                    expect(res.headers["access-control-allow-credentials"]).to.equal("true");
                    done();
                });
            });
        });

        it("should not add an Access-Control-Allow-Headers header if there are no response headers to expose", function (done) {
            var requestListener;
            requestListener = corser.create();
            req.headers["origin"] = "example.com";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-headers"]).to.equal(undefined);
                done();
            });
        });

        it("should add an Access-Control-Expose-Headers header with all the exposed response headers if there are response headers to expose", function (done) {
            var requestListener;
            requestListener = corser.create({
                responseHeaders: corser.simpleResponseHeaders.concat(["X-Corser"])
            });
            req.headers["origin"] = "example.com";
            requestListener(req, res, function () {
                expect(res.headers["access-control-expose-headers"]).to.equal("x-corser");
                done();
            });
        });

    });

    describe("A preflight request", function () {

        beforeEach(function () {
            req.method = "OPTIONS";
        });

        it("should not add any headers if an Access-Control-Request-Method header is not present in the request", function (done) {
            var requestListener;
            requestListener = corser.create({
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            requestListener(req, res, function () {
                expect(Object.keys(res.headers).length).to.equal(0);
                done();
            });
        });

        it("should not add any headers if the Access-Control-Request-Method header contains a non-simple method", function (done) {
            var requestListener;
            requestListener = corser.create({
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "PUT";
            requestListener(req, res, function () {
                expect(Object.keys(res.headers).length).to.equal(0);
                done();
            });
        });

        it("should not add any headers if the Access-Control-Request-Headers header contains a non-simple request header", function (done) {
            var requestListener;
            requestListener = corser.create({
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            req.headers["access-control-request-headers"] = "X-Corser";
            requestListener(req, res, function () {
                expect(Object.keys(res.headers).length).to.equal(0);
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header of \"*\" for any given origin if the list of origins in unbound", function (done) {
            var requestListener;
            requestListener = corser.create({
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.org";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("*");
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header of \"example.com\" if the given origin matches one of the origins in the list of origins", function (done) {
            var requestListener;
            requestListener = corser.create({
                origins: ["example.com"],
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("example.com");
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header of \"example.com\" and an Access-Control-Allow-Credentials header of \"true\" if credentials are supported and the list of origins in unbound", function (done) {
            var requestListener;
            requestListener = corser.create({
                supportsCredentials: true,
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("example.com");
                expect(res.headers["access-control-allow-credentials"]).to.equal("true");
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header of \"example.com\" and an Access-Control-Allow-Credentials header of \"true\" if credentials are supported and the given origin matches one of the origins in the list of origins", function (done) {
            var requestListener;
            requestListener = corser.create({
                origins: ["example.com"],
                supportsCredentials: true,
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).to.equal("example.com");
                expect(res.headers["access-control-allow-credentials"]).to.equal("true");
                done();
            });
        });

        it("should add an Access-Control-Allow-Origin header even though Origin was not added to the list of request headers", function (done) {
            var requestListener;
            requestListener = corser.create({
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            req.headers["access-control-request-headers"] = "Origin";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-origin"]).not.to.equal(undefined);
                done();
            });
        });

        it("should add an Access-Control-Max-Age header of \"50\" if maxAge is set", function (done) {
            var requestListener;
            requestListener = corser.create({
                maxAge: 50,
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res, function () {
                expect(res.headers["access-control-max-age"]).to.equal(50);
                done();
            });
        });

        it("should add an Access-Control-Allow-Methods header with all methods that are in the list of methods", function (done) {
            var requestListener;
            requestListener = corser.create({
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-methods"]).to.equal(corser.simpleMethods.join(","));
                done();
            });
        });

        it("should add an Access-Control-Allow-Headers header with all request headers that are in the list of request headers", function (done) {
            var requestListener;
            requestListener = corser.create({
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-headers"]).to.equal(corser.simpleRequestHeaders.join(","));
                done();
            });
        });

        it("should add an Access-Control-Allow-Headers header that includes x-corser even though the name of the header in the Access-Control-Request-Headers header is not a case-sensitive match", function (done) {
            var requestListener, requestHeaders;
            requestHeaders = corser.simpleRequestHeaders.concat(["x-corser"]);
            requestListener = corser.create({
                requestHeaders: requestHeaders,
                endPreflightRequests: false
            });
            req.headers["origin"] = "example.com";
            req.headers["access-control-request-method"] = "GET";
            req.headers["access-control-request-headers"] = "X-Corser";
            requestListener(req, res, function () {
                expect(res.headers["access-control-allow-headers"]).to.eql(requestHeaders.join(","));
                done();
            });
        });

        it("should end preflight requests by default", function () {
            var requestListener;
            requestListener = corser.create();
            req.headers["origin"] = "example.org";
            req.headers["access-control-request-method"] = "GET";
            requestListener(req, res);
            expect(res.status).to.be(204);
            expect(res.ended).to.be(true);
        });

    });

});
