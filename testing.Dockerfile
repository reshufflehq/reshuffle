FROM node:10

ENV CYPRESS_DEPS='xvfb libgtk-3-dev libnotify-dev libgconf-2-4 libnss3 libxss1 libasound2'
ENV SCRIPTS_DEPS='jq'
RUN apt update && apt install -y $CYPRESS_DEPS $SCRIPTS_DEPS
WORKDIR /project
RUN chown node:node /project
USER node

ADD --chown=node:node scripts/ ./scripts
ADD --chown=node:node interfaces/ ./interfaces
RUN scripts/generate_interfaces
ADD --chown=node:node . ./
RUN node common/scripts/install-run-rush.js install
RUN node common/scripts/install-run-rush.js rebuild --verbose
