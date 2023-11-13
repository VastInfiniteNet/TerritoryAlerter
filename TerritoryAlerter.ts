type TerritoryCoordinate = [number, number];
type TerritoryLine = [TerritoryCoordinate, TerritoryCoordinate];
type Polygon = TerritoryCoordinate[];

interface TerritoryDetails {
    name: string;
    id: string;
    polygon: Polygon[];
    x: number;
    z: number;
    nation: string;
    website: string;
    color: string;
}

class TerritoryAlerter {
    TerritoryName: string;
    TerritoryFeatures: TerritoryDetails[];
    #CurrentLocation: string;
    #Debug: boolean;

    constructor(territoryJsonFileName: string, debug: boolean = false) {
        this.ReadJson(territoryJsonFileName);
        this.#Debug = debug;
    }

    ReadJson(fileName: string) { // TODO: support multiple claims maps
        if (this.#Debug)
            Chat.log(`Reading in ${fileName}` as any)
        if (!FS.exists(fileName)) {
            // TODO: download claims map if one doesn't exist
            Chat.log(`Territory file '${fileName}' does not exist! Stopping...` as any);
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
            Chat.log("Error reading into territory json file name, stopping..." as any);
        }
    }

    Check(): boolean {
        var isPresent: boolean;

        for(let feature of this.TerritoryFeatures) {
            if (this.#Debug)
                Chat.log(`Checking ${feature.name}` as any);

            let currentPos: TerritoryCoordinate = [ Math.floor(Player.getPlayer().getPos().getX()), 
                                                    Math.floor(Player.getPlayer().getPos().getZ())];
            if (feature.polygon == undefined) { // feature is a point
                isPresent = currentPos[0] == feature.x && currentPos[1] == feature.z;
            } else { // feature is a polygon
                isPresent = this.#IsPointInFeature(currentPos, feature);
            }

            if (!isPresent)
                continue;
            
            if (feature.name != this.#CurrentLocation) {
                switch(TERRITORY_CHANGE_DISPLAY_OPTION) {
                    case TERRITORY_CHANGE_DISPLAY_OPTIONS.TITLE:
                        Chat.title(`Entered ${feature.name}` as any, `${feature.name}, ${this.TerritoryName}` as any, 10, 30, 10);
                        break;
                    case TERRITORY_CHANGE_DISPLAY_OPTIONS.TOAST:
                        Chat.toast(`Entered ${feature.name}` as any, `${feature.name}, ${this.TerritoryName}` as any);
                        break;
                }
                World.playSound(TERRITORY_ENTER_SOUND, 0.1, 100);
                this.#CurrentLocation = feature.name;
            }
            return true;
        }

        if (this.#Debug)
            Chat.log(`IsPresent: ${isPresent}, Location: ${this.#CurrentLocation}` as any);

        if (!isPresent && this.#CurrentLocation != undefined) {
            switch(TERRITORY_CHANGE_DISPLAY_OPTION) {
                case TERRITORY_CHANGE_DISPLAY_OPTIONS.TITLE:
                    Chat.title("NOW IN THE UNKNOWN" as any, `You have left ${this.TerritoryName}` as any, 10, 30, 10);
                    break;
                case TERRITORY_CHANGE_DISPLAY_OPTIONS.TOAST:
                    Chat.toast("NOW IN THE UNKNOWN" as any, `Left ${this.TerritoryName}` as any);
                    break;
            }
            World.playSound(TERRITORY_LEAVE_SOUND, 0.1, 0.5);
            this.#CurrentLocation = undefined;
        }
        return false;
    }

    #IsPointInFeature(point: TerritoryCoordinate, feature: TerritoryDetails): boolean {
        for (let poly of feature.polygon) {
            if (this.#Debug)
                Chat.log(`Checking polygon with ${poly.length} vertices` as any);
            if (this.#IsPointInPolygon(point, poly)) {
                if (this.#Debug)
                    Chat.log(`Point in poly (${poly.length})` as any);                
                return true;
            }
        }
        return  false;
    }

    #IsPointInPolygon(point: TerritoryCoordinate, polygon: Polygon):  boolean {
        if (polygon.length < 3) return false;

        let count = 0;
        for (let i = 0; i < polygon.length; i++) {
            let a = polygon[i];
            let b = polygon[(i+1)%polygon.length];

            if (this.#IsPointOnLine(point, [a,b]) &&                            // point left of line segment
                point[0] < a[0] + ((point[1]-a[1])/(b[1]-a[1]))*(b[0]-a[0])) {  // point near line   
                count++
                if (this.#Debug)
                    Chat.log(`   Intersection w/: [${a}, ${b}]` as any);
            }
        }

        if (this.#Debug)
            Chat.log(`   Count: ${count}` as any)
        return count % 2 == 1;
    }

    #IsPointOnLine(point: TerritoryCoordinate, line: TerritoryLine): boolean  {
        return (point[1] < line[0][1]) != (point[1] < line[1][1]);
    }
}

//////////////////////////////////////////////////////////
/////////////// CONFIG //////////////////////////////////

const TERRITORY_CLAIMS_FILENAME = "Updated Icenian Territory.json"; // Should be in same folder as script
const TERRITORY_POLLING_INTERVAL = 1;  // IN SECONDS
const TERRITORY_DEBUG_MODE = false;   // logs debug messages to the chat
const TERRITORY_ENTER_SOUND = "entity.player.levelup";  // sound when player entered some territory
const TERRITORY_LEAVE_SOUND = "entity.wither.spawn";    // sound when player left entire territory 

// DISPLAY OPTIONS
enum TERRITORY_CHANGE_DISPLAY_OPTIONS {
    TOAST,
    TITLE,
};
const TERRITORY_CHANGE_DISPLAY_OPTION: TERRITORY_CHANGE_DISPLAY_OPTIONS = TERRITORY_CHANGE_DISPLAY_OPTIONS.TOAST;

/////////////// END OF CONFIG ///////////////////////////
/////////////////////////////////////////////////////////////

function runTerritoryAlerter() {
    let Alerter = new TerritoryAlerter(TERRITORY_CLAIMS_FILENAME, TERRITORY_DEBUG_MODE);

    if (Alerter.TerritoryFeatures == undefined) {
        Chat.log("Error..." as any);
        return;
    }

    let tickInterval = TERRITORY_POLLING_INTERVAL * 20;

    let listener = JsMacros.on('Tick', JavaWrapper.methodToJava(() => {
        if (World.getTime() % tickInterval == 0) 
            Alerter.Check();
    }) as any);

    event.stopListener = JavaWrapper.methodToJava(() => {
        JsMacros.off(listener);
    });
}

runTerritoryAlerter()
