FROM alpine:3.19

# Install Postfix and required packages
RUN apk add --no-cache \
    postfix \
    postfix-pgsql \
    ca-certificates \
    cyrus-sasl \
    libsasl \
    supervisor \
    curl \
    openssl

# Create mail directories
RUN mkdir -p /var/mail /var/spool/postfix /etc/postfix/ssl

# Copy configuration files
COPY postfix/main.cf /etc/postfix/main.cf
COPY postfix/master.cf /etc/postfix/master.cf
COPY postfix/pgsql-virtual-mailbox-maps.cf /etc/postfix/pgsql-virtual-mailbox-maps.cf
COPY scripts/entrypoint.sh /entrypoint.sh
COPY supervisord.conf /etc/supervisord.conf

# Make entrypoint executable
RUN chmod +x /entrypoint.sh

# Expose SMTP ports
EXPOSE 25 587

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
