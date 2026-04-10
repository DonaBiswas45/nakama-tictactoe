FROM heroiclabs/nakama:3.21.1
COPY ./modules /nakama/data/modules
COPY ./nakama-config.yml /nakama/data/config.yml
CMD ["/bin/sh", "-ecx", "/nakama/nakama migrate up --database.address $DATABASE_URL && exec /nakama/nakama --config /nakama/data/config.yml --database.address $DATABASE_URL"]
