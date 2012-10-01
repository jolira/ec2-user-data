/*jslint white: true, forin: false, node: true, indent: 4 */
(function (module) {
    "use strict";

    var assert = require('assert'),
        vows = require('vows'),
        horaa = require('horaa'),
        config = require('../lib/config'),
        fs = require('fs'),
        readFile = fs.readFile,
        fsHorra = horaa("fs"),
        httpHorra = horaa("http"),
        testFile = false;

    fsHorra.hijack("readFile", function (file, encoding, cb) {
        if (!testFile) {
            return cb(new Error("not returning a file"));
        }

        return cb(undefined, "{\"aws-access-key-id\":\"9FM2B4CEW5YED5T3VJG2\"," +
            "\"aws-secret-access-key\":\"bP54UHZDYyMRx79QiMXnoGAmUAkDBabHgZWnFZ15\"," +
            "\"aws-log-bucket\":\"joachimkainz\",\"aws-region\":\"us-west-1\"," +
            "\"aws-logging\":false}");
    });
    httpHorra.hijack("get", function(args, cb) {
        assert.equal(args.host, '169.254.169.254');
        assert.equal(args.port, 80);

        var matched = args.path.match(/^\/latest\/(.*)$/),
            key = matched[1];

        (function(key) {
            setTimeout(function() {
                var dataHandler;

                return cb({
                    setEncoding:function(encoding) {
                        assert.equal(encoding, 'utf8');
                    },
                    on:function(event, handler) {
                        if (event === 'data') {
                            return dataHandler = handler;
                        }

                        assert(event, 'end');

                        setTimeout(function() {
                            switch (key) {
                                case "user-data":
                                    dataHandler("user-data");
                                    break;
                                case "meta-data/placement/availability-zone":
                                    dataHandler("us-west-1a");
                                    break;
                                case "meta-data/local-ipv4":
                                    dataHandler("192.168.1.10");
                                    break;
                                case "meta-data/iam/security-credentials/security-group":
                                    dataHandler(JSON.stringify({
                                        AccessKeyId: "AccessKeyId",
                                        SecretAccessKey: "SecretAccessKey"
                                    }));
                                    break;
                                case "meta-data/iam/security-credentials/":
                                    dataHandler("security-group");
                                    break;
                            }
                            return handler();
                        }, 10);
                    }
                });
            }, 10);
        })(key);

        return {
            on:function(key) {
                assert.equal(key, 'error');
            }
        };
    });

    // Create a Test Suite
    vows.describe('configure').addBatch({
        'configure from file':{
            topic:function () {
                testFile = true;
                config(this.callback);
            },
            'configure from s3':{
                topic:function (content) {
                    assert.equal(content["aws-access-key-id"], "9FM2B4CEW5YED5T3VJG2");
                    assert.equal(content["aws-secret-access-key"], "bP54UHZDYyMRx79QiMXnoGAmUAkDBabHgZWnFZ15");
                    assert.equal(content["aws-log-bucket"], "joachimkainz");
                    assert.equal(content["aws-region"], "us-west-1");
                    assert.equal(content["aws-logging"], false);

                    testFile = false;
                    config(this.callback);
                },
                "check results":function (content) {
                    assert.equal(content['aws-logging'], true);
                    assert.equal(content['aws-secret-access-key'], "SecretAccessKey");
                    assert.equal(content['aws-log-bucket'], "security-group");
                    assert.equal(content['aws-region'], "us-west-1");
                    assert.equal(content['local-ipv4'], "192.168.1.10");
                    assert.equal(content['aws-access-key-id'], "AccessKeyId");
                    assert.equal(content['manifest'], "user-data");
                }
            }
        }
    }).export(module);
})(module);
