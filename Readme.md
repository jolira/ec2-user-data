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

Example:

```bash
ec-user-data
```

License
-----------------

[MIT License](https://raw.github.com/jolira/deployer/master/LICENSE.txt)
