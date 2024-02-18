/**
 * 
 * @author Prof. Chaos
 * @type Pseudo class
 */
var bbClock = (function(){ 
    
    let bbClocks = new Map();
    let bbClocksCount = 0;
    
    function bbClocFctkWorker(isNotWorker) {
        let cstart = performance.now();
        let intv = 0;
        let limit = Infinity;
        let delay = 0;
        let debug = null;
        let name = "";
        
        function debugMsg(msg, fgcolor, bgcolor) {
            if (debug)
                console.log(`%c${ msg }`, `background-color: ${ bgcolor }; color: ${ fgcolor }`);
        }
        
        if (!isNotWorker) self.onmessage = function(e) {
            if(typeof e.data === "object") {
                for (let dname in e.data) {
                    switch(dname) {
                        case "intv":
                            intv = Number(e.data.intv) || intv;
                            intv = (intv === Infinity) ? intv : parseInt(e.data.intv) ;
                        break;
                        case "limite":
                            limit = parseInt(e.data.limite) || limit;
                        break;
                        case "delay":
                            delay = parseInt(e.data.delay);
                        break;
                        case "debug":
                            debug = !!e.data.debug;
                        break;
                        case "name":
                            name = "" + e.data.name + ", ";
                        break;
                    }
                }
                if ((e.data.start === true) && intv !== null) {
                    if (delay) { while((performance.now()-cstart) < delay) {}; };
                    doTicks();
                }
            }
        };

        function doTicks() {
            debugMsg("==[ bbClock ("+name+cstart+") : Intervalle = "+intv+" ms, Limite = "+limit+" ]==", "white", "darkblue");
            let lastTick = performance.now();
            let depart = lastTick;
            let tnum = 0;
            while((lastTick-depart) < limit) {
                while((performance.now()-lastTick) < intv) {}
                lastTick = lastTick + intv;
                postMessage({"tick": {"time":lastTick, "num":tnum}});
                tnum++;
            }
            debugMsg("==[ bbClock : Fin ]==", "white", "indigo");
        };
    };



    return function(args) {
        bbClocksCount++;
        let debug = args.debug || true;
        let name = args.name || "b"+bbClocksCount;
        let test = args.test || null;
        let onTick = function(){};
        let onFail = function(){};
        let _tick = function(){};
        let _incTicks = function(){};
        let speed = null;
        let limit = null;
        let delay = null;
        let autostart = args.autostart || null;
        let bbClockWorker = null;
        
        let isRunning = false;
        let isCreated = false;
        let softPaused = false;
        let hardPaused = false;
        
        let nbTicks = 0;
        let lastTick = 0;
        
        function debugMsg(msg, fgcolor, bgcolor) {
            if (debug)
                console.log(`%c${ msg }`, `background-color: ${ bgcolor }; color: ${ fgcolor }`);
        }
        
        function setOnTick(tickCallback) { 
            if (typeof tickCallback === "function") {
                onTick = tickCallback;
                if (!softPaused) { 
                    _tick = onTick; 
                    _incTicks = incTicks;
                }
                return true;
            } 
            return false;
        };
        function setOnFail(failCallBack) { 
            if (typeof failCallBack === "function") {
                onFail = failCallBack;
                return true;
            } 
            return false;
        };
        function setSpeed(spd) { 
            if (typeof spd === "number"  && spd>=0) { 
                speed = spd; 
                if (isCreated) {
                    if (isRunning) {
                        return createWorker(true);
                    } else {
                        bbClockWorker.postMessage({"intv" : speed});
                    }
                }
                return true;
            } 
            else { 
                speed = Infinity;
            } 
            return true;
        };
        function setDelay(del) { 
            if (typeof del === "number" && del>=0) {
                delay = del;
                if (isCreated) {
                    if (isRunning) { 
                        return false; 
                    } else {
                        bbClockWorker.postMessage({"delay" : delay});
                    }
                }
                return true;
            } 
            return false;
        };
        function setLimite(lim) { 
            if (typeof lim === "number" && lim>0) {
                limit = lim;
                if (isCreated) {
                    if (isRunning) { 
                        return false; 
                    } else {
                        bbClockWorker.postMessage({"limite" : limit});
                    }                    
                }
                return true;
            } 
            return false;
        }

        Object.defineProperty(this, 'onTick', { set(tickCallback) { setOnTick(tickCallback); } });
        Object.defineProperty(this, 'onFail', { set(failCallBack) { setOnTick(failCallBack); } });
        Object.defineProperty(this, 'speed', { set(spd) { setSpeed(spd); } });
        Object.defineProperty(this, 'delay', { set(del) { setDelay(del); } });
        Object.defineProperty(this, 'limite', { set(lim) { setDelay(lim); } });
        Object.defineProperty(this, 'isRunning', { get() { return isRunning; } });
        
        function incTicks() { nbTicks++; }
        
        function onMessage(e) {
            lastTick = e.data.tick.time;
            _tick(lastTick , e.data.tick.num, nbTicks);
            _incTicks();
        }
        function createWorker(start) {
             if (isCreated) { 
                bbClockWorker.terminate(); 
                isCreated = false;
                isRunning = false;
                debugMsg("======[ bbClock ("+name+") : killed ]======", "white" ,"darkred");
             }

            let opts = {};
            if (speed) opts.intv = speed;
            if (delay) opts.delay = delay;
            if (limit) opts.limite = limit;
            if (name) opts.name = name;
            if (debug) opts.debug = true;
            if (start) opts.start = true;
            let bbClockBlob = new Blob(['(',bbClocFctkWorker.toString(),')()'],{"type" : "application/javascript"});
            bbClockWorker = new Worker(URL.createObjectURL(bbClockBlob));
            bbClockWorker.onmessage = onMessage.bind(this);
            bbClockWorker.postMessage(opts);
            if (bbClockWorker instanceof Worker) {
                isCreated = true;
                if (start) isRunning = true;
                debugMsg("======[ bbClock ("+name+", "+speed+") : prête ]======", "white" ,"darkgreen");
                return true;
            } else {
                debugMsg("======[ bbClock ("+name+") : error ]======", "white" ,"darkred");
                if (onFail) { onFail(); }
                return false;
            }
        };
        function startWorker() {
            if (isRunning) { return; }
            if (!isCreated) {
                createWorker(true);
            }
            else {
                bbClockWorker.postMessage({"start" : true});
                isRunning = true;
            }
        };
        function stopWorker() {
            if (isCreated && (bbClockWorker instanceof Worker)) {
                bbClockWorker.terminate();
                debugMsg("======[ bbClock ("+name+") : killed ]======", "white" ,"darkred");
            }
            isRunning = false;
            isCreated = false;
        };
        this.start = function() { startWorker(); };
        this.stop = function() { stopWorker(); };
        this.pause = function (tim) {
            setDelay(tim);
            stopWorker();
        };
        this.resetTicks = function() {
            nbTicks = 0;
        };
        this.getNbTicks = function() { return nbTicks; };
        this.toString = function() {
            return "isRunning : " + isRunning + "\n" +
                   "nbTicks : " + nbTicks;
        };
        this.softPause = function() {
            softPaused = true;
            _tick = function(){};
            _incTicks = function(){};
            debugMsg("======[ bbClock : pause (true) ]======", "white", "darkgrey");
        };
        this.softUnpause = function() {
            softPaused = false;
            _tick = onTick;
            _incTicks = incTicks;
            debugMsg("======[ bbClock : pause (false) ]======", "white", "darkgrey");
        };
        this.hardPause = function() {
            _stopWorker();
            delay = speed - (performance.now() - lastTick) ;
            hardPaused = true;
            debugMsg("======[ bbClock : hard pause (true) ]======", "white", "darkgrey");
        };
        this.hardUnpause = function() {
            if (hardPaused) {
                startWorker();
                hardPaused = false;
            }
            debugMsg("======[ bbClock : hard pause (false) ]======", "white", "darkgrey");
        };

        setOnTick(args.onTick);
        setOnFail(args.onFail);
        if (test) {
            autostart = true;
            setSpeed(500);
            setDelay(500);
            setLimite(1);        
        } else {
            setSpeed(args.speed);
            setDelay(args.delay);
            setLimite(args.limite);
            createWorker();
        }
        if(autostart) { startWorker(); }
    };
})();



/*
let myClock = new bbClock(bbTest, 1000, 0, true);
 * 
 * 
 */