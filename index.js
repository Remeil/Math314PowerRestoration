'use strict';
(function() {
    $(document).ready(function() {

        function convertToSeconds(hour, minute) {
            return hour * 3600 + minute * 60;
        }

        function convertToHourMinute(seconds) {
            return {
                hour: Math.floor(seconds / 3600),
                minute: Math.floor(seconds % 3600 / 60),
                second: seconds % 60
            };
        }

        var reportedPowerOutages = [];
        var repairCrews = [];
        var simulationTime = 0; //simulation times measured in seconds
        var stormIsActive = true;
        var stormEnds = convertToSeconds(6, 0);
        var simulationIsNotComplete = true;

        var speedLimit = 60;
        var distanceFactor = 1;
        var peopleFactor = 1;
        var businessFactor = {
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
            airport: {weight: 1, canRepairBeforeStormEnds: false}
        }
        var repairTimeFactor = 1;
        var waitTimeFactor = 1;

        var numberOfRepairCrewsAtEachLocation = 1; //one crew has to stay at home base at all times

        var allPowerOutages = [];

        //Simulation functions
        function powerOutageUrgency(potentialRepairCrew) {
            //taxicab geometry
            var MAXIMUMDISTANCE = 230;

            var distance = MAXIMUMDISTANCE - (((this.x - potentialRepairCrew.x) + (this.y - potentialRepairCrew.y)) * distanceFactor / speedLimit);
            var people = this.peopleAffected * peopleFactor;
            var business = businessFactor[this.business].weight;
            var repairTime = (1 / this.repairEstimate) * repairTimeFactor;
            var waitTime = (simulationTime - this.reportedTime) * waitTimeFactor / 3600; //convert wait time back to hours to match other time parameters

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

        var crewNumber = 1;
        function RepairCrew(x, y, powerOutage, lastOvertime) {
            this.x = x;
            this.y = y;
            this.powerOutage = powerOutage;
            this.lastOvertime = lastOvertime;
            this.isCrewAvailable = isCrewAvailable;
            this.workHoursRemaining = convertToSeconds(8, 0);
            this.crewNumber = crewNumber;

            crewNumber++;
        }

        function resetSimulation() {
            reportedPowerOutages = [];
            repairCrews = [];
            allPowerOutages = [];
            simulationIsNotComplete = true;

            crewNumber = 1;
            powerOutageNumber = 1;

            $("#outputLog").html("<p>Starting simulation...</p>");
            for (var i = 0; i < numberOfRepairCrewsAtEachLocation; i++) {
                repairCrews.push(new RepairCrew(0, 0, null, null));
                //repairCrews.push(new RepairCrew(40, 40, null, null));
            }

            allPowerOutages.push(new PowerOutageEvent(-25, -25, "cable", 100, convertToSeconds(2, 30), convertToSeconds(4, 30)));
            allPowerOutages.push(new PowerOutageEvent(25, 25, "railroad", 100, convertToSeconds(2, 30), convertToSeconds(8, 30)));

            simulationTime = 0;

            runSimulation();
        }

        function nextEvent() {
            var nextEventTime = -1;
            var nextEventExists = false;
            var outagesWithoutCrews = [];
            var nextEvent = null;
            var nextEventDescription = "";

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

            if (outagesWithoutCrews.length > 0) {
                var maxUrgency = 0;
                for (var i = 0; i < repairCrews.length; i++) {
                    var crew = repairCrews[i];

                    if (!crew.isCrewAvailable()) {
                        continue; //skip over crew if not available
                    }

                    for (var j = 0; j < outagesWithoutCrews.length; j++) {
                        var outage = outagesWithoutCrews[j];

                        var urgency = outage.powerOutageUrgency(crew);

                        if (urgency > maxUrgency) {
                            nextEvent = {crew: crew, outage: outage}
                            nextEventTime = 0;
                            nextEventDescription = "assign crew";
                        }
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
                    var currentTime = convertToHourMinute(simulationTime);
                    var timeString = zeroPadString(currentTime.hour, 2) + ":" + zeroPadString(currentTime.minute, 2) + ":" + zeroPadString(currentTime.second, 2);
                    switch (event.nextEventDescription) {
                        case "assign crew": {
                            var crew = event.nextEvent.crew;
                            var powerOutage = event.nextEvent.outage;

                            crew.powerOutage = powerOutage;
                            powerOutage.repairCrew = crew;
                            powerOutage.workStartTime = simulationTime;

                            $("#outputLog").append("<p>Assigning crew number " + crew.crewNumber + " to outage " + powerOutage.powerOutageNumber + " at time " + timeString + "</p>");
                            break;
                        }
                        case "outage fixed": {
                            var powerOutage = event.nextEvent.outage;

                            powerOutage.isFixed = true;
                            powerOutage.repairCrew.powerOutage = null; //relieve crew of duty first, then unassign crew from outage
                            powerOutage.repairCrew = null;

                            $("#outputLog").append("<p>Outage number " + powerOutage.powerOutageNumber + " has been repaired. Work crew " + crew.crewNumber + " finished at time " + timeString + ".</p>");
                            break;
                        }
                        case "new outage": {
                            var powerOutage = event.nextEvent.outage;

                            reportedPowerOutages.push(powerOutage);

                            $("#outputLog").append("<p>Outage number " + powerOutage.powerOutageNumber + " has been reported. Time is " + timeString + "</p>");
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