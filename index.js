'use strict';
(function() {
    $(document).ready(function() {

        var reportedPowerOutages = [];
        var repairCrews = [];
        var simulationTime = 0; //simulation times measured in hours
        var stormIsActive = true;
        var stormEnds = 6; //storm ends at 6
        var simulationIsNotComplete = true;

        var speedLimit = 60;
        var distanceFactor = 1;
        var peopleFactor = 1;
        var generalBusinessFactor = 1;
        var specificBusinessFactor = {
            cable: {weight: 1, canRepairBeforeStormEnds: false},
            residential: {weight: 1, canRepairBeforeStormEnds: false},
            hospital: {weight: 1, canRepairBeforeStormEnds: true},
            railroad: {weight: 1, canRepairBeforeStormEnds: true},
            area: {weight: 1, canRepairBeforeStormEnds: false},
            cityHall: {weight: 1, canRepairBeforeStormEnds: false},
            fireDepartment: {weight: 1, canRepairBeforeStormEnds: false},
            industry: {weight: 1, canRepairBeforeStormEnds: false},
            highSchool: {weight: 1, canRepairBeforeStormEnds: false},
            elementarySchool: {weight: 1, canRepairBeforeStormEnds: false},
            restaurant: {weight: 1, canRepairBeforeStormEnds: false},
            policeStation: {weight: 1, canRepairBeforeStormEnds: false},
            college: {weight: 1, canRepairBeforeStormEnds: false},
            stores: {weight: 1, canRepairBeforeStormEnds: false},
            trafficLights: {weight: 1, canRepairBeforeStormEnds: false},
            bank: {weight: 1, canRepairBeforeStormEnds: false},
            civicCenter: {weight: 1, canRepairBeforeStormEnds: false},
            airport: {weight: 1, canRepairBeforeStormEnds: false},
            shoppingMall: {weight: 1, canRepairBeforeStormEnds: false}
        }
        var repairTimeFactor = 1;
        var waitTimeFactor = 1;

        var numberOfRepairCrewsAtEachLocation = 5; //one crew has to stay at home base at all times

        var allPowerOutages = [];

        //Simulation functions
        function powerOutageUrgency(potentialRepairCrew) {
            var MAXDISTANCE = 230;

            //taxicab geometry
            var distance = (MAXDISTANCE - (Math.abs(this.x - potentialRepairCrew.x) + Math.abs(this.y - potentialRepairCrew.y))) * distanceFactor / speedLimit;
            var people = this.peopleAffected * peopleFactor;
            var business = specificBusinessFactor[this.business].weight * generalBusinessFactor;
            var repairTime = (1 / this.repairEstimate) * repairTimeFactor;
            var waitTime = (simulationTime - this.reportedTime) * waitTimeFactor;

            var urgency = distance + people + business + repairTime + waitTime;

            return urgency;
        }

        var powerOutageNumber = 1;
        function PowerOutageEvent(x, y, business, peopleAffected, repairEstimate, reportedTime, repairCrew) {
            this.x = x;
            this.y = y;
            this.business = business;
            this.peopleAffected = peopleAffected;
            this.repairEstimate = repairEstimate;
            this.reportedTime = reportedTime;
            this.repairCrew = repairCrew;
            this.workStartTime = -1;
            this.isFixed = false;
            this.powerOutageUrgency = powerOutageUrgency;
            this.powerOutageNumber = powerOutageNumber;

            powerOutageNumber++;
        }

        function isCrewAvailable() {
            return !this.powerOutage || this.powerOutage.repairEstimate === 0;
        }

        function hasTime(outage) {
            var travelTimeToOutage = (Math.abs(this.x - outage.x) + Math.abs(this.y - outage.y)) / speedLimit;
            var travelHomeFromOutage = (Math.abs(outage.x - this.homeX) + Math.abs(outage.y - this.homeY)) / speedLimit;
            var totalTime = travelHomeFromOutage + travelTimeToOutage + outage.repairEstimate;

            if (this.nextShiftStartTime == null) {
                return 16 >= totalTime;
            }
            else {
                return (this.nextShiftStartTime - simulationTime - 8) >= totalTime;
            }

        }

        var crewNumber = 1;
        function RepairCrew(x, y, powerOutage) {
            this.x = x;
            this.y = y;
            this.homeX = x;
            this.homeY = y;
            this.nextShiftStartTime = null;

            this.crewNumber = crewNumber;
            this.hasTime = hasTime;
            this.powerOutage = powerOutage;
            this.isCrewAvailable = isCrewAvailable;

            crewNumber++;
        }

        function resetSimulation() {
            reportedPowerOutages = [];
            repairCrews = [];
            allPowerOutages = [];
            simulationIsNotComplete = true;
            stormIsActive = true;

            crewNumber = 1;
            powerOutageNumber = 1;

            $("#outputLog").html("<p>Starting simulation...</p>");
            for (var i = 0; i < numberOfRepairCrewsAtEachLocation; i++) {
                repairCrews.push(new RepairCrew(0, 0, null, null));
                repairCrews.push(new RepairCrew(40, 40, null, null));
            }

            //x, y, business, peopleAffected, repairEstimate, reportedTime
            allPowerOutages.push(new PowerOutageEvent(-10, 30, "cable", 0, 6, 4.333));
            allPowerOutages.push(new PowerOutageEvent(3, 3, "residential", 20, 7, 5.5));
            allPowerOutages.push(new PowerOutageEvent(20, 5, "hospital", 240, 8, 5.583));
            allPowerOutages.push(new PowerOutageEvent(-10, 5, "railroad", 75025, 5, 5.916));
            allPowerOutages.push(new PowerOutageEvent(13, 30, "residential", 45, 2, 6.083));
            allPowerOutages.push(new PowerOutageEvent(5, 20, "area", 2000, 7, 6.1));
            allPowerOutages.push(new PowerOutageEvent(60, 45, "residential", 0, 9, 6.133));
            allPowerOutages.push(new PowerOutageEvent(1, 10, "cityHall", 0, 7, 6.15));
            allPowerOutages.push(new PowerOutageEvent(5, 20, "shoppingMall", 200, 5, 6.25));
            allPowerOutages.push(new PowerOutageEvent(5, -25, "fireDepartment", 15, 3, 6.333));
            allPowerOutages.push(new PowerOutageEvent(12, 18, "residential", 350, 6, 6.333));
            allPowerOutages.push(new PowerOutageEvent(7, 10, "area", 400, 6, 6.366));
            allPowerOutages.push(new PowerOutageEvent(-1, 19, "industry", 190, 10, 6.416));
            allPowerOutages.push(new PowerOutageEvent(-20, -19, "industry", 395, 7, 6.666));
            allPowerOutages.push(new PowerOutageEvent(-1, 30, "area", 0, 6, 6.916));
            allPowerOutages.push(new PowerOutageEvent(-20, 30, "highSchool", 1200, 3, 7));
            allPowerOutages.push(new PowerOutageEvent(40, 20, "elementarySchool", 1700, 12, 7));
            allPowerOutages.push(new PowerOutageEvent(7, -20, "restaurant", 25, 12, 7));
            allPowerOutages.push(new PowerOutageEvent(8, -23, "policeStation", 125, 7, 7));
            allPowerOutages.push(new PowerOutageEvent(25, 15, "elementarySchool", 1900, 5, 7.083));
            allPowerOutages.push(new PowerOutageEvent(-10, -10, "residential", 0, 9, 7.166));
            allPowerOutages.push(new PowerOutageEvent(-1, 2, "college", 3000, 8, 7.166));
            allPowerOutages.push(new PowerOutageEvent(8, -25, "industry", 450, 5, 7.166));
            allPowerOutages.push(new PowerOutageEvent(18, 55, "residential", 350, 10, 7.166));
            allPowerOutages.push(new PowerOutageEvent(7, 35, "area", 400, 9, 7.333));
            allPowerOutages.push(new PowerOutageEvent(20, 0, "residential", 800, 5, 7.75));
            allPowerOutages.push(new PowerOutageEvent(-6, 30, "hospital", 300, 5, 7.833));
            allPowerOutages.push(new PowerOutageEvent(0, 40, "stores", 50, 6, 8.25));
            allPowerOutages.push(new PowerOutageEvent(15, -25, "trafficLights", 0, 3, 8.333));
            allPowerOutages.push(new PowerOutageEvent(-20, -35, "bank", 20, 5, 8.583));
            allPowerOutages.push(new PowerOutageEvent(47, 30, "residential", 40, 12, 8.833));
            allPowerOutages.push(new PowerOutageEvent(55, 50, "residential", 0, 12, 9.833));
            allPowerOutages.push(new PowerOutageEvent(-18, -35, "residential", 10, 10, 10.5));
            allPowerOutages.push(new PowerOutageEvent(-1, 50, "civicCenter", 150, 5, 10.5));
            allPowerOutages.push(new PowerOutageEvent(-7, -8, "airport", 350, 4, 10.583));
            allPowerOutages.push(new PowerOutageEvent(5, -25, "fireDepartment", 15, 5, 10.833));
            allPowerOutages.push(new PowerOutageEvent(8, 20, "area", 300, 12, 11.5));

            simulationTime = 0;

            speedLimit = $("#speedLimit").val();
            distanceFactor = $("#distanceFactor").val();
            peopleFactor = $("#peopleFactor").val();
            generalBusinessFactor = $("#generalBusinessFactor").val();
            repairTimeFactor = $("#repairTimeFactor").val();
            waitTimeFactor = $("#waitTimeFactor").val();

            runSimulation();
        }

        function nextEvent() {
            var nextEventTime = -1;
            var nextEventExists = false;
            var outagesWithoutCrews = [];
            var nextEvent = null;
            var nextEventDescription = "";

            //check for new outage
            for (var j = 0; j < allPowerOutages.length; j++) {
                var outage = allPowerOutages[j];
                if (simulationTime < outage.reportedTime) {
                    var timeUntilOutage = outage.reportedTime - simulationTime;

                    if (!nextEventExists) {
                        nextEventExists = true;
                        nextEventTime = timeUntilOutage;
                        nextEvent = {outage: outage};
                        nextEventDescription = "new outage";
                    }
                    else if (timeUntilOutage < nextEventTime) {
                        nextEvent = {outage: outage};
                        nextEventTime = timeUntilOutage;
                        nextEventDescription = "new outage";
                    }
                }
            }

            //check for outage fixed
            for (var i = 0; i < reportedPowerOutages.length; i++) {
                var outage = reportedPowerOutages[i];

                if (!outage.repairCrew && !outage.isFixed) {
                    outagesWithoutCrews.push(outage);
                }
                else if (outage.repairCrew) {
                    var timeUntilCompletion = outage.workStartTime + outage.repairEstimate - simulationTime;

                    if (!nextEventExists) {
                        nextEventExists = true;
                        nextEventTime = timeUntilCompletion;
                        nextEvent = {outage: outage};
                        nextEventDescription = "outage fixed";
                    }
                    else {
                        if (timeUntilCompletion < nextEventTime ) {
                            nextEvent = {outage: outage};
                            nextEventTime = timeUntilCompletion;
                            nextEventDescription = "outage fixed";
                        }
                    }
                }
            }

            //check for crew available to fix outage
            if (outagesWithoutCrews.length > 0) {
                var maxUrgency = 0;
                for (var i = 0; i < repairCrews.length; i++) {
                    var crew = repairCrews[i];

                    if (!crew.isCrewAvailable()) {
                        continue; //skip over crew if not available
                    }

                    for (var j = 0; j < outagesWithoutCrews.length; j++) {
                        var outage = outagesWithoutCrews[j];

                        if (stormIsActive && !specificBusinessFactor[outage.business].canRepairBeforeStormEnds) {
                            continue; //we can't work on this outage yet
                        }

                        if (!crew.hasTime(outage))  {
                            continue; //if we don't have enough time left in workday, then skip over this outage
                        }

                        var urgency = outage.powerOutageUrgency(crew);

                        if (urgency > maxUrgency) {
                            nextEvent = {crew: crew, outage: outage}
                            nextEventTime = 0;
                            nextEventDescription = "assign crew";
                            maxUrgency = urgency;
                        }
                    }
                }
            }


            //check if storm is ending
            if (stormIsActive) {
                var timeUntilStormEnds = stormEnds - simulationTime;
                if (timeUntilStormEnds < nextEventTime) {
                    nextEvent = {};
                    nextEventTime = timeUntilStormEnds;
                    nextEventDescription = "storm ends";
                }
            }
            //check for crews shifts starting up again, but only if we aren't done
            if (nextEvent != null) {
                for (var i = 0; i < repairCrews.length; i++) {
                    var crew = repairCrews[i];

                    if (crew.nextShiftStartTime == null) {
                        continue; //this crew hasn't been assigned something this shift yet, so they haven't started their shift yet;
                    }

                    var timeUntilCrewShift = crew.nextShiftStartTime - simulationTime;

                    if (timeUntilCrewShift <= nextEventTime) {
                        nextEvent = {crew: crew};
                        nextEventTime = timeUntilCrewShift;
                        nextEventDescription = "new shift";
                    }
                }
            }

            if (nextEvent == null) {
                return {done: true}
            }
            else {
                return {done: false, nextEvent: nextEvent, nextEventTime: nextEventTime, nextEventDescription: nextEventDescription}
            }
        }

        function runSimulation() {
            while (simulationIsNotComplete) {
                var event = nextEvent();

                if (event.done) {
                    simulationIsNotComplete = false;
                    $("#outputLog").append("<p>Simulation complete!</p>");
                }
                else {
                    simulationTime += event.nextEventTime;
                    switch (event.nextEventDescription) {
                        case "assign crew": {
                            var crew = event.nextEvent.crew;
                            var powerOutage = event.nextEvent.outage;

                            crew.powerOutage = powerOutage;
                            powerOutage.repairCrew = crew;
                            powerOutage.workStartTime = simulationTime;

                            powerOutage.repairEstimate += (Math.abs(powerOutage.x - crew.x) + Math.abs(powerOutage.y - crew.y)) / speedLimit;

                            if (crew.nextShiftStartTime == null) {
                                crew.nextShiftStartTime = simulationTime + 24;
                            }

                            $("#outputLog").append("<p>Assigning crew number " + crew.crewNumber + " to outage " + powerOutage.powerOutageNumber + " at time " + simulationTime + "</p>");
                            break;
                        }
                        case "outage fixed": {
                            var powerOutage = event.nextEvent.outage;
                            var repairCrew = powerOutage.repairCrew;

                            powerOutage.isFixed = true;
                            repairCrew.powerOutage = null; //relieve crew of duty first, then unassign crew from outage
                            powerOutage.repairCrew = null;

                            $("#outputLog").append("<p>Outage number " + powerOutage.powerOutageNumber + " has been repaired. Work crew " + repairCrew.crewNumber + " finished at time " + simulationTime + ".</p>");
                            break;
                        }
                        case "new outage": {
                            var powerOutage = event.nextEvent.outage;

                            reportedPowerOutages.push(powerOutage);

                            $("#outputLog").append("<p>Outage number " + powerOutage.powerOutageNumber + " has been reported. Time is " + simulationTime + "</p>");
                            break;
                        }
                        case "storm ends": {
                            stormIsActive = false;

                            $("#outputLog").append("<p>Storm ends. Time is " + simulationTime + "</p>");
                            break;
                        }
                        case "new shift": {
                            var repairCrew = event.nextEvent.crew;

                            repairCrew.nextShiftStartTime = null;
                            repairCrew.x = repairCrew.homeX;
                            repairCrew.y = repairCrew.homeY;

                            $("#outputLog").append("<p>Repair crew " + repairCrew.crewNumber + " has started a new shift. Time is " + simulationTime + "</p>");
                            break;
                        }
                    }
                }
            }
        }

        //Helper functions
        function zeroPadString(unformattedString, padLength) {
            var workingCopy = String(unformattedString);

            for (var i = workingCopy.length; i < padLength; i++) {
                workingCopy = "0" + workingCopy;
            }

            return workingCopy;
        }

        //event handlers
        $("#runIt").on("click", function() {
            resetSimulation();
        });

    })
})();