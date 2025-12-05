FROM zmlai/llmd

# Install busybox to get shell and coreutils
COPY --from=busybox:1.36.0-uclibc /bin/sh /bin/sh
COPY --from=busybox:1.36.0-uclibc /bin/mkdir /bin/mkdir
COPY --from=busybox:1.36.0-uclibc /bin/cp /bin/cp
COPY --from=busybox:1.36.0-uclibc /bin/echo /bin/echo
COPY --from=busybox:1.36.0-uclibc /bin/ls /bin/ls
COPY --from=busybox:1.36.0-uclibc /bin/rm /bin/rm
COPY --from=busybox:1.36.0-uclibc /bin/chmod /bin/chmod
COPY --from=busybox:1.36.0-uclibc /bin/cat /bin/cat
COPY --from=busybox:1.36.0-uclibc /bin/date /bin/date
COPY --from=busybox:1.36.0-uclibc /bin/du /bin/du
COPY --from=busybox:1.36.0-uclibc /bin/awk /bin/awk

# Install s5cmd for fast GCS transfers
COPY --from=peak/s5cmd /s5cmd /bin/s5cmd

# Ensure the binary inside the /llmd directory is executable
RUN chmod +x /llmd/llmd

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]