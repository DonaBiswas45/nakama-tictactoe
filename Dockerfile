FROM heroiclabs/nakama:3.21.1

COPY ./modules /nakama/data/modules
COPY ./nakama-config.yml /nakama/data/config.yml

CMD ["/nakama/nakama", "--config", "/nakama/data/config.yml", "--database.address", "${DATABASE_URL}"]
