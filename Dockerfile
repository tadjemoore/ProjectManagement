# small python image
FROM python:3.13-slim

# prevent pyhon from buffering logs so synology logs update immediately 
ENV PYTHONUNBUFFERED=1

# set app working directory inside the container
WORKDIR /app

# copy the whole project inot the image
COPY . /app

# enure persistent data directory exists inside container
 # RUN mkdir -p /data or projects.db?
VOLUME ["/data"]

# expose port the server will run on
EXPOSE 8000

# start application
CMD ["python", "server.py"]