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
    TerritoryJsonFileName: string;
    TerritoryFeatures: TerritoryDetails[];
    #CurrentLocation: string;
    #Debug: boolean;

    constructor(territoryJsonFileName: string, debug: boolean = false) {
        this.TerritoryJsonFileName = territoryJsonFileName;
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
            this.TerritoryFeatures = JSON.parse(FS.open(fileName).read()).features;
        }
        catch(e) {
            Chat.log(e);
            Chat.log("Error reading into territory json file name, stopping..." as any);
        }
    }

    #CleanPos(): TerritoryCoordinate {
        return [Math.floor(Player.getPlayer().getPos().getX()), Math.floor(Player.getPlayer().getPos().getZ())];
    }

    Check(): boolean {
        var isPresent: boolean;

        for(let feature of this.TerritoryFeatures) {
            if (this.#Debug)
                Chat.log(`Checking ${feature.name}` as any);

            if (feature.polygon == undefined) { // feature is a point
                isPresent = this.#CleanPos()[0] == feature.x && this.#CleanPos()[1] == feature.z;
            } else {
                isPresent = this.#IsPointInFeature(this.#CleanPos(), feature);
            }

            if(isPresent) {
                if (feature.name != this.#CurrentLocation) {
                    Chat.toast("Location Changed" as any, `Entered ${feature.name}` as any);
                    World.playSound("entity.player.levelup", 0.1, 100);
                    this.#CurrentLocation = feature.name;
                }
                return true;
            } 
        }

        if (this.#Debug)
            Chat.log(`IsPresent: ${isPresent}, Location: ${this.#CurrentLocation}` as any);

        if (!isPresent && this.#CurrentLocation != undefined) {
            Chat.toast("Location Changed" as any, "LEFT TERRITORY" as any);
            World.playSound("entity.wither.spawn", 0.1, 0.5);
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

function runTerritoryAlerter() {
    let Alerter = new TerritoryAlerter("Updated Icenian Territory.json");

    if (Alerter.TerritoryFeatures == undefined) {
        Chat.log("Error..." as any);
        return;
    }

    let timeInterval = 5; // update location interval
    let tickInterval = timeInterval * 20;

    let listener = JsMacros.on('Tick', JavaWrapper.methodToJava(() => {
        if (World.getTime() % tickInterval == 0) {
            Chat.log(World.getTime() as any);
            Alerter.Check();
        }
    }) as any);

    event.stopListener = JavaWrapper.methodToJava(() => {
        JsMacros.off(listener);
    });
}

runTerritoryAlerter()
