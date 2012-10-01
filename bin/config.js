#!/usr/bin/env node
(function (process, console) {
    "use strict";

    var config = require("../lib/config");

    return config(function (err, config) {
        if (err) {
            return console.error("retrieving config failed", err);
        }

        console.log("config=", JSON.stringify(config));
    });
})(process, console);