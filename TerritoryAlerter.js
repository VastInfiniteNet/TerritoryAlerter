class TerritoryAlerter {
    TerritoryJsonFileName;
    TerritoryFeatures;
    #CurrentLocation;
    #Debug;

    constructor(territoryJsonFileName, debug = false) {
        this.TerritoryJsonFileName = territoryJsonFileName;
        this.readJson(territoryJsonFileName);
        this.#Debug = debug;
    }

    readJson(fileName) {
        if (this.#Debug)
            Chat.log(`Reading in ${fileName}`)
        if (!FS.exists(fileName)) {
            Chat.log(`Territory file '${fileName}' does not exist! Stopping...`);
            return;
        }
        try {
            this.TerritoryFeatures = JSON.parse(FS.open(fileName).read()).features;
        }
        catch(e) {
            Chat.log(e);
            Chat.log("Error reading into territory json file name, stopping...");
        }
    }

    #CleanPos() {
        return [Math.floor(Player.getPlayer().getPos().getX()), Math.floor(Player.getPlayer().getPos().getZ())];
    }

    Check() {
        var isPresent;

        for(let feature of this.TerritoryFeatures) {
            if (this.#Debug)
                Chat.log(`Checking ${feature.name}`);

            if (feature.polygon == undefined) { // feature is a point
                isPresent = this.#CleanPos()[0] == feature.x && this.#CleanPos()[1] == feature.z;
            } else {
                isPresent = this.#IsPointInFeature(this.#CleanPos(), feature);
            }

            if(isPresent) {
                if (feature.name != this.#CurrentLocation) {
                    Chat.toast("Location Changed", `Entered ${feature.name}`);
                    World.playSound("entity.player.levelup", 0.1, 100);
                    this.#CurrentLocation = feature.name;
                }
                return true;
            } 
        }

        if (this.#Debug)
            Chat.log(`IsPresent: ${isPresent}, Location: ${this.#CurrentLocation}`);

        if (!isPresent && this.#CurrentLocation != undefined) {
            Chat.toast("Location Changed", 'NOT IN TERRITORY');
            World.playSound("entity.wither.spawn", 0.1, 0.5);
            this.#CurrentLocation = undefined;
        }
        return false;
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
                    Chat.log(`\tIntersection w/: [${a}, ${b}]`);
            }
        }

        if (this.#Debug)
            Chat.log(`\tCount: ${count}`)
        return count % 2 == 1;
    }

    #IsPointOnLine(point, line)  {
        return (point[1] < line[0][1]) != (point[1] < line[1][1]);
    }
}

function runTerritoryAlerter() {
    let Alerter = new TerritoryAlerter("Updated Icenian Territory.json");

    if (Alerter.TerritoryFeatures == undefined) {
        Chat.log("Error...");
        return;
    }

    let timeInterval = 5; // update location interval
    let tickInterval = timeInterval * 20;

    let listener = JsMacros.on('Tick', JavaWrapper.methodToJava(() => {
        if (World.getTime() % tickInterval == 0) {
            Chat.log(World.getTime());
            Alerter.Check();
        }
    }));

    event.stopListener = JavaWrapper.methodToJava(() => {
        JsMacros.off(listener);
    });
}

runTerritoryAlerter()
