# ProjectManagement
Project Management application for use within controls at Rhino Pump, deployable on NAS

## Deploying On To Synology NAS
This application automattially creates a Docker Container when GIT commits
are pushed to the cloud.

Allow for a minute or two for the docker container to be built

To pull container onto the NAS and run

### Downloading The Image
Open <Container Manager>
In the side bar select <Registry> and search <tadje> in the top left
This will search Docker for all Images made by Tadje
The Image you want is <rhino-projects-server> double click to download onto the NAS

### Running a Container
Once downloaded click on the container and click <Run>
This wil open a pop up to set how the container runs
You can leave <Container Name> and <Image Name> as they are
Check <Auto-Restart> and click <Next>

### Loading Database
Do not set <Local Port> for the IP address, the container should be on <Port 8000> already
To load the database into the container 
Click <Add Folder> in <Volume Settings>
Click <docker>/<rhino-projects-server>/<data> and select
In the neighboring field put </data>
No need to change any of the <Environment> settings

### Setting IP Address
Scroll down to <Network> and find <Network>
Select the drop down and change it from <Bridge> to <Host>
Click <Next>

### Double Check
Double check settings before running container
Container should spin up and run on <Port 8000>