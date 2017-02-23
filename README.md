Cf-docker-Builder
=================
[![Codefresh build status]( https://g.codefresh.io/api/badges/build?repoOwner=codefresh-io&repoName=cf-docker-builder&branch=CF-3678&pipelineName=cf-docker-builder&accountName=codefresh-inc&key=eyJhbGciOiJIUzI1NiJ9.NTY3MmQ4ZGViNjcyNGI2ZTM1OWFkZjYy.AN2wExsAsq7FseTbVxxWls8muNx_bBUnQWQVS8IgDTI&type=cf-1)]( https://g.codefresh.io/repositories/codefresh-io/cf-docker-builder/builds?filter=trigger:build;branch:CF-3678;service:58a9bf25cced120100340bd5~cf-docker-builder)

This is a image for building an images file in docker and returns error codes according to the
problem of the build. 

Error Codes
-----------

| Exit Code | Description           |
| ---------:| --------------------- |
|         1 | Unknown Error         |
|        11 | Docker file Not Found |
|        12 | Unknown instruction   |
|        13 | Instruction failed    |
