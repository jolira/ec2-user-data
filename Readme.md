ec-user-data [<img src="https://secure.travis-ci.org/jolira/ec2-user-data.png" />](http://travis-ci.org/#!/jolira/ec2-user-data)
========================================

A very simple library to access user-data on EC2 machines (or a configuration file called ``${HOME}\.deployer.json``
everywhere else).

This library first check of the existence of a file called ``${HOME}\.deployer.json``. If this file exists, the content
of the file is parsed and, if the file contains valid JSON, the content is returned.

If there is no ``${HOME}\.deployer.json``, the library tries to access
[AWS Instance Metadata](http://docs.amazonwebservices.com/AWSEC2/latest/UserGuide/AESDG-chapter-instancedata.html). In
particular, this library accesses information passed using the ``user-data`` field that can be passed when launching
an instance.

Command-Line Example
---------------------

```bash
ubuntu@ip-10-252-172-224:/tmp$ node_modules/.bin/ec2-user-data
config= {"aws-logging":true,"application-name":"deployer","aws-log-bucket":"tmw-tailoring-qa-logs","aws-region":"us-west-2","local-ipv4":"10.252.172.224","aws-access-key-id":"AKIAJKRUL44GH2U7AP5Q","aws-secret-access-key":"EVQKm+xVCjhwbjZOlOqxDpf+eBFSIaSK13Um0uFQ","manifest":"s3://tmw-tailoring-qa/config/tailoring.json"}
```

Node.js Example
---------------------

```JavaScript
var config = require("ec-user-data");

return config(function (err, config) {
   if (err) {
       return console.error("retrieving config failed", err);
   }

    console.log("config=", JSON.stringify(config));
});
```

License
-----------------

[MIT License](https://raw.github.com/jolira/deployer/master/LICENSE.txt)
