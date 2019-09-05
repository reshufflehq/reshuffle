FROM node:10

RUN apt update && apt install -y jq
WORKDIR /project

COPY scripts/ ./scripts
COPY interfaces/ ./interfaces
RUN scripts/generate_interfaces
COPY . ./
RUN node common/scripts/install-run-rush.js install
RUN node common/scripts/install-run-rush.js rebuild --verbose
