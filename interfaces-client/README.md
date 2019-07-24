# What's this?

A minimal *fake* wrapper package for generated code.  `interfaces`
uses [Concord](https://github.com/concord) to write typed client and
server codes.

rush doesn't like gnerate entire packages.  These wrappers (one for
server code, one for client code) generate and export these packages
as part of their build step -- but they _already_ look enough like the
finished packages to allow rush to function.

To prevent accidental publication these fake packages are "private".
The *real* packages are not.
