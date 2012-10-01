(function (module) {
    "use strict";

    var TIMEOUT = 5000,
        fs = require("fs"),
        http = require('http'),
        path = require("path"),
        Batch = require("batch");

    function merge(cfg1, cfg2) {
        var keys = Object.keys(cfg2);

        keys.forEach(function (key) {
            cfg1[key] = cfg2[key];
        });

        return cfg1;
    }

    function parseJson(data, cb) {
        try {
            return cb(undefined, JSON.parse(data));
        }
        catch (e) {
            return cb(new Error("failed to parse " + data + " " + e.toString()));
        }
    }

    function parseUserData(data, cb) {
        if (!data) {
            return {};
        }

        if (data[0] === '{') {
            return parseJson(data, cb);
        }

        return cb(undefined, data && {
            manifest:data
        });
    }

    function home() {
        return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    }

    function value(key, cb) {
        var req = http.get({
            host:'169.254.169.254',
            port:80,
            path:'/latest/' + key
        }, function (res) {
            var data = "";

            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data += chunk;
            });
            return res.on('end', function () {
                return cb && cb(undefined, data);
            });
        });

        req.on('error',function (e) {
            return cb && cb(e);
        });
        req.setTimeout(TIMEOUT, function () {
            var _cb = cb;

            cb = undefined;
            req.abort();
            return _cb && _cb(new Error("request timed out"));
        });

        return req;
    }

    function loadConfigFile(cb) {
        var h = home(),
            file = path.join(h, ".deployer.json");

        return fs.readFile(file, "utf-8", function (err, content) {
            if (err) {
                return cb(); // ignore readfile errors
            }

            var parsed = JSON.parse(content);

            return cb(parsed);
        });
    }

    /*
     http://docs.amazonwebservices.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html

     # wget -q -O - http://169.254.169.254/latest/meta-data/iam/security-credentials/TMW-QA
     {
     "Code" : "Success",
     "LastUpdated" : "2012-09-22T03:39:45Z",
     "Type" : "AWS-HMAC",
     "AccessKeyId" : "ASIAJSGE67BCZS7EUJNQ",
     "SecretAccessKey" : "DKgwU3YkF9tjFA2RODVxNII4U4qUvfoW0iPz/HCN",
     "Token" : "AQoDYXdzEFUakAIzOxXPVSqq9zwndS5lyySsR9GxTkX7iecLi/PgUpIgZz6jM+0M6YA/H3BE4pQmY43/wcH7YF7t3EtuzHSWoNizpKN1W4A2TAByY37kZZQaSeRuaw6Uo86C7uMh0gbpT52cZQC4tvgzDLu7NtKHsY01v/8G/mx/nrFFECB9xV448k853MDZbG01uU56cGaJbjgTN0ciDcZ4c68Z30TF+ucHOr5LW4BFrI1zNRJhl7XjXermPLs3Qba4/783uO2UGRaSpHbhNNCbYcc9KLQE4HMz+W0iyvcFCg8hOJ4Rly88adhgXABP8wk0EqSRFnHNyADK0Ux7rn1RtD+uj8DdpmElDD40oL0RFuDxJB0c8ReSpSCZ5vSCBQ==",
     "Expiration" : "2012-09-22T09:42:09Z"
     }
     # wget -q -O - http://169.254.169.254/latest/user-data
     # wget -q -O - http://169.254.169.254/latest/meta-data/local-hostname
     ip-10-166-5-20.us-west-1.compute.internal
     # wget -q -O - http://169.254.169.254/latest/meta-data/local-ipv4
     10.166.5.20
     */
    function loadEC2Config(cb) {
        var result = {
                "aws-logging":true,
                "application-name":"deployer"
            },
            batch = new Batch();

        batch.push(function (cb) {
            return value("meta-data/placement/availability-zone", function (err, value) {
                if (value) {
                    result["aws-region"] = value.slice(0, -1);
                }

                return cb(err);
            });
        });
        batch.push(function (cb) {
            return value("meta-data/local-ipv4", function (err, value) {
                result["local-ipv4"] = value;

                return cb(err);
            });
        });
        batch.push(function (cb) {
            return value("meta-data/iam/security-credentials/", function (err, val) {
                if (err) {
                    return cb(err);
                }

                if (!val) {
                    return cb();
                }

                result["aws-log-bucket"] = val;

                return value("meta-data/iam/security-credentials/" + val, function (err, value) {
                    if (err) {
                        return cb(err);
                    }

                    return parseJson(value, function (err, value) {
                        if (err) {
                            return cb(); // ignore
                        }

                        result["aws-access-key-id"] = value.AccessKeyId;
                        result["aws-secret-access-key"] = value.SecretAccessKey;

                        return cb();
                    });
                });
            });
        });
        batch.end(function (err) {
            if (err) {
                return cb(err);
            }

            return value("user-data", function (err, value) {
                if (err) {
                    return cb(err);
                }

                return parseUserData(value, function (err, config) {
                    if (err) {
                        return cb(err);
                    }

                    return cb(undefined, merge(result, config));
                });
            });
            return cb(err, result);
        });
    }

    module.exports = function (cb) {
        return loadConfigFile(function (config) {
            if (config) {
                return cb(undefined, config);
            }

            return loadEC2Config(cb);
        });
    };
})(module);