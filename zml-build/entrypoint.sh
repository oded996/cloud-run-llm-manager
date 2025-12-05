#!/bin/sh
set -e

MODEL_SOURCE=$1
LOCAL_MODEL_DIR="/tmp/local-model"
shift

if [ -z "$MODEL_SOURCE" ]; then
  echo "Error: First argument must be the model source (gs://... URI)."
  exit 1
fi

echo "Starting Copy from $MODEL_SOURCE to $LOCAL_MODEL_DIR..."
mkdir -p "$LOCAL_MODEL_DIR"

START_TIME=$(date +%s)

# Check if source is a GS URI
if echo "$MODEL_SOURCE" | awk '/^gs:\/\// {exit 0} {exit 1}'; then
    echo "Detected GS URI. Using s5cmd..."
    # s5cmd cp "gs://bucket/path/*" "/local/path/"
    # Note: s5cmd supports globbing.
    /bin/s5cmd cp "${MODEL_SOURCE}/*" "$LOCAL_MODEL_DIR/"
else
    echo "Detected local path (FUSE mount). Using cp..."
    cp -rv "$MODEL_SOURCE"/* "$LOCAL_MODEL_DIR/"
fi

END_TIME=$(date +%s)

DURATION=$((END_TIME - START_TIME))
SIZE_BYTES=$(du -sb "$LOCAL_MODEL_DIR" | awk '{print $1}')

# Calculate stats using awk for floating point math
SIZE_GB=$(awk -v bytes="$SIZE_BYTES" 'BEGIN {print bytes / 1073741824}')
SPEED=$(awk -v size_gb="$SIZE_GB" -v duration="$DURATION" 'BEGIN {if (duration == 0) print "inf"; else print size_gb / duration}')

echo "---------------------------------------------------"
echo "Copy Stats:"
echo "  Duration: $DURATION seconds"
echo "  Size:     $SIZE_GB GB ($SIZE_BYTES bytes)"
echo "  Speed:    $SPEED GB/s"
echo "---------------------------------------------------"

echo "Starting ZML..."
cd /llmd
exec ./llmd --model-dir="$LOCAL_MODEL_DIR" "$@"