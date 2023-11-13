class TerritoryAlerter {
    TerritoryName;
    TerritoryFeatures;
    #CurrentLocation;
    #Debug;

    constructor(territoryJsonFileName, debug = false) {
        this.ReadJson(territoryJsonFileName);
        this.#Debug = debug;
    }

    ReadJson(fileName) { // TODO: support multiple claims maps
        if (this.#Debug)
            Chat.log(`Reading in ${fileName}`)
        if (!FS.exists(fileName)) {
            // TODO: download claims map if one doesn't exist
            Chat.log(`Territory file '${fileName}' does not exist! Stopping...`);
            return;
        }
        try {
            let file = FS.open(fileName);
            let territoryJson = JSON.parse(file.read());
            this.TerritoryFeatures = territoryJson.features;
            this.TerritoryName = territoryJson.name;
        }
        catch(e) {
            Chat.log(e);
            Chat.log("Error reading into territory json file name, stopping...");
        }
    }

    Check() {
        var isPresent;

        for(let feature of this.TerritoryFeatures) {
            if (this.#Debug)
                Chat.log(`Checking ${feature.name}`);

            let currentPos = [ Math.floor(Player.getPlayer().getPos().getX()), 
                                                    Math.floor(Player.getPlayer().getPos().getZ())];
            if (feature.polygon == undefined) { // feature is a point
                isPresent = currentPos[0] == feature.x && currentPos[1] == feature.z;
            } else { // feature is a polygon
                isPresent = this.#IsPointInFeature(currentPos, feature);
            }

            if (!isPresent)
                continue;
            
            if (feature.name != this.#CurrentLocation) {
                let featureName = this.#Colorize(feature.name, feature.color);
                let message = Chat.createTextBuilder().append("Entered ").append(featureName).build();
                let subtitle = Chat.createTextBuilder().append(featureName).append(`, ${this.TerritoryName}`).build();

                if ((TERRITORY_CHANGE_DISPLAY_OPTION & TERRITORY_CHANGE_DISPLAY_OPTIONS.TITLE) != 0)
                    Chat.title(message, subtitle, 10, 35, 10);
                if ((TERRITORY_CHANGE_DISPLAY_OPTION & TERRITORY_CHANGE_DISPLAY_OPTIONS.TOAST) != 0)        
                    Chat.toast(message, subtitle);
                if ((TERRITORY_CHANGE_DISPLAY_OPTION & TERRITORY_CHANGE_DISPLAY_OPTIONS.LOG) != 0)        
                    Chat.log(subtitle);

                World.playSound(TERRITORY_ENTER_SOUND, 0.1, 100);
                this.#CurrentLocation = feature.name;
            }
            return true;
        }

        if (this.#Debug)
            Chat.log(`IsPresent: ${isPresent}, Location: ${this.#CurrentLocation}`);

        if (!isPresent && this.#CurrentLocation != undefined) {
            let message = "NOW IN THE UNKNOWN";
            let subtitle =  `You have left ${this.TerritoryName}`;
            if ((TERRITORY_CHANGE_DISPLAY_OPTION & TERRITORY_CHANGE_DISPLAY_OPTIONS.TITLE) != 0)
                Chat.title(message, subtitle, 10, 35, 10);
            if ((TERRITORY_CHANGE_DISPLAY_OPTION & TERRITORY_CHANGE_DISPLAY_OPTIONS.TOAST) != 0)
                Chat.toast(message, subtitle);
            if ((TERRITORY_CHANGE_DISPLAY_OPTION & TERRITORY_CHANGE_DISPLAY_OPTIONS.LOG) != 0)
                Chat.log(`NOW IN THE UNKNOWN, You have left ${this.TerritoryName}`);



            World.playSound(TERRITORY_LEAVE_SOUND, 0.1, 0.5);
            this.#CurrentLocation = undefined;
        }
        return false;
    }

    #Colorize(name, colorString) {
        if (colorString === undefined)
            return Chat.createTextBuilder().append(Chat.createTextHelperFromString(name));

        let color = [parseInt(colorString.slice(1,3), 16), parseInt(colorString.slice(3,5), 16), parseInt(colorString.slice(5,7), 16)];
        return Chat.createTextBuilder().append(name).withColor(...color);
    }

    #IsPointInFeature(point, feature) {
        for (let poly of feature.polygon) {
            if (this.#Debug)
                Chat.log(`Checking polygon with ${poly.length} vertices`);
            if (this.#IsPointInPolygon(point, poly)) {
                if (this.#Debug)
                    Chat.log(`Point in poly (${poly.length})`);                
                return true;
            }
        }
        return  false;
    }

    #IsPointInPolygon(point, polygon) {
        if (polygon.length < 3) return false;

        let count = 0;
        for (let i = 0; i < polygon.length; i++) {
            let a = polygon[i];
            let b = polygon[(i+1)%polygon.length];

            if (this.#IsPointOnLine(point, [a,b]) &&                            // point left of line segment
                point[0] < a[0] + ((point[1]-a[1])/(b[1]-a[1]))*(b[0]-a[0])) {  // point near line   
                count++
                if (this.#Debug)
                    Chat.log(`   Intersection w/: [${a}, ${b}]`);
            }
        }

        if (this.#Debug)
            Chat.log(`   Count: ${count}`)
        return count % 2 == 1;
    }

    #IsPointOnLine(point, line)  {
        return (point[1] < line[0][1]) != (point[1] < line[1][1]);
    }
}

//////////////////////////////////////////////////////////
/////////////// CONFIG //////////////////////////////////

const TERRITORY_CLAIMS_FILENAME = "Updated Icenian Territory.json"; // Should be in same folder as script
const TERRITORY_POLLING_INTERVAL = 4;  // IN SECONDS
const TERRITORY_DEBUG_MODE = false;   // logs debug messages to the chat
const TERRITORY_ENTER_SOUND = "entity.player.levelup";  // sound when player entered some territory
const TERRITORY_LEAVE_SOUND = "entity.wither.spawn";    // sound when player left entire territory 

// DISPLAY OPTIONS
// To use multiple display options add the option after a bitwise OR (|) to the end of TERRITORY_CHANGE_DISPLAY_OPTION
const TERRITORY_CHANGE_DISPLAY_OPTIONS = {
    TOAST: 1 << 0,
    TITLE: 1 << 1,
    LOG:   1 << 2,
};
const TERRITORY_CHANGE_DISPLAY_OPTION = TERRITORY_CHANGE_DISPLAY_OPTIONS.TOAST;
// to use all set to 0xFF
/////////////// END OF CONFIG ///////////////////////////
/////////////////////////////////////////////////////////////

function runTerritoryAlerter() {
    let Alerter = new TerritoryAlerter(TERRITORY_CLAIMS_FILENAME, TERRITORY_DEBUG_MODE);

    if (Alerter.TerritoryFeatures == undefined) {
        Chat.log("Error...");
        return;
    }

    let tickInterval = TERRITORY_POLLING_INTERVAL * 20;

    let listener = JsMacros.on('Tick', JavaWrapper.methodToJava(() => {
        if (World.getTime() % tickInterval == 0) 
            Alerter.Check();
    }));

    event.stopListener = JavaWrapper.methodToJava(() => {
        JsMacros.off(listener);
    });
}

runTerritoryAlerter()
