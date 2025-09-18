# `ubuntu` is the default username for playwright container
FROM mcr.microsoft.com/playwright:v1.55.0-noble

RUN apt-get update && apt-get install -y --no-install-recommends \
  unzip \
  vim \
  git \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="/workspace/app/node_modules/.bin:$PATH"

USER ubuntu
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.2.22"
