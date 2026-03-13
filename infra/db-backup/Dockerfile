FROM alpine:3.18

RUN apk add --no-cache postgresql-client

WORKDIR /app
COPY backup.sh .
RUN chmod +x backup.sh

RUN mkdir -p /backups

CMD ["./backup.sh"]
