var ModeFormatter = (function () {
	
	var utils = {
		/**
		 * Trim a string.
		 */
		trim: function(s) {
			return s.replace(/^\s+/, "").replace(/\s+$/, "");
		},
		
		/**
		 * Gets a integer digest (positive or negative) for string.
		 */
		stringDigest: function (s) {
			var result = 0;

			for (var i = 0, l = s.length; i < l; i++) {
				result = ((result << 5) - result) + s.charCodeAt(i);
				result = result & result;
			}
			
			return result;
		},

		/**
		 * Sort and compact string sequence of numbers.
		 */
		compactSequence: function (s, unique) {
			//example
			//1,3,4,5,5,5,6,11,32 => 1,3...6,11,32 (when unique is true)
			//1,3,4,5,5,5,6,11,32 => 1,3...5,5,5...6,11,32 (when unique is false)
			
			unique = unique || true;
			
			var 
				result = "",
				keys = s.split(",");
			
			//sort numerically, ascending
			keys.sort(function (a, b) {
				return a - b;
			});
			
			//remove duplicates
			if (unique) {
				keys = (function (keys) {
					var uniqueKeys = [];
					
					for (var i = 0, l = keys.length; i < l; i++) {
						if (keys[i] != keys[i + 1]) {
							uniqueKeys.push(keys[i]);
						}
					}
					
					return uniqueKeys;
				})(keys);
			}

			for (var i = 0, l = keys.length; i < l; i++) {
				if (keys[i] - (keys[i - 1]) === 1) {
					if (keys[i + 1] - (keys[i]) === 1) {
						continue;
					}
					result += "..." + keys[i];
					continue;
				}
				
				if (i != 0) {
					result += ",";
				}
				
				result += keys[i];
			}
			
			return result;
		},
		
		/**
		 * Turns special string sequence of numbers to human-readable format.
		 */
		getDaysFromSequence: function (s, repl) {
			//example
			//0...4,6 => Mon-Fri, Sun
			
			var 
				result = [],
				days = s.split(",");
			
			for (var i = 0, l = days.length, intervals, interval = ""; i < l; i++) {
				//looking for interval
				if (days[i].indexOf("...") != -1) {
					intervals = days[i].split("...");
					for (var j = 0, m = intervals.length; j < m; j++) {
						interval += repl[intervals[j]];
						if (j != intervals.length - 1) {
							interval += "-";
						}
					}
					result.push(interval);
				} else {
					result.push(repl[days[i]]);
				}
			}
			
			result = result.join(", ");

			return result;
		},

		/**
		 * Make and sort special object's array.
		 */
		objectToArray: function (obj, prop) {
			var 
				result = [],
				newObject = {},
				
				sort = function (obj1, obj2) {
					return obj1[prop] - obj2[prop];
				};

			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					newObject = obj[key];
					
					//set type
					newObject.type = key;

					result.push(newObject);
				}
			}

			result.sort(sort);
			
			return result;
		}
	};
	
	
	var formatter = {
			typeNames: {},

			aliases: {},

			//in order of values in the modes
			dayNames: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
			
			noctidialName: "round-the-clock",
			
			daysIntervalDelimeter: "-",

			typeDelimeter: ",",
			
			typeDelimeterLast: "and",
			
			typePostfix: ":",

			modesDelimeter: ";",
			
			modeDelimeter: ",",
			
			dash: "&#8212;",

			/**
			 * Build types for next usage.
			 */
			buildTypes: function (types) {
				var 
					list,
					listModes,
					listModesIsEqual,
					listModesString,
		
					normalizeMode = function (s) {
						var hours = s.split(";");
						for (var i = 0, l = hours.length; i < l; i++) {
							if (hours[i] != "") {
								hours[i] = parseFloat(hours[i]).toFixed(2);
							}
						}

						return hours.join(";");
					};

				for (var type in types) {
					if (types[type] === null || typeof types[type] == "undefined") {
						//remove empty types
						delete types[type];
						
						continue;
					}
					
					list = types[type];
					listModes = [];

					for (var i = 0, l = list.length, mode, modeValue; i < l; i++) {
						mode = list[i].mode;

						//normalize modes
						for (var j = 0, m = mode.length; j < m; j++) {
							mode[j] = normalizeMode(mode[j]);
						}
						
						modeValue = mode.join("");
						listModes.push(modeValue);

						list[i].modeDigest = utils.stringDigest(modeValue);
						list[i].modeIsEqual = modeValue === new Array(mode.length + 1).join(mode[0]);
					}

					listModesString = listModes.join("");

					listModesIsEqual = listModesString == new Array(listModes.length + 1).join(listModes[0]);
					modeDigest = listModesIsEqual ? utils.stringDigest(listModes[0]) : utils.stringDigest(listModesString);
					
					types[type] = {
						list: list,
						listModesIsEqual: listModesIsEqual,
						modeDigest: modeDigest
					};
				}

				return types;
			},
			
			/**
			 * Render one mode.
			 */
			renderMode: function (modes) {
				var 
					mode = modes[0],
					days,
					time,
					dayMode,
					groups = {},
					modeList = [],

					getKeys = function (arr, obj) {
						var indexes = [];
						
						for (var i = 0, l = arr.length; i < l; i++) {
							if (arr[i] === obj) {
								indexes.push(i);
							}
						}
						
						return indexes;
					};

				for (var i = 0, l = mode.length, indexes = []; i < l; i++) {
					indexes = getKeys(mode, mode[i]);
					
					groups[indexes.join(",")] = mode[i];
				}

				for (var group in groups) {
					if (this.isValidDate(groups[group])) {
						days = utils.getDaysFromSequence(utils.compactSequence(group), this.dayNames);

						time = this.getAliasOrNot(this.renderTime(groups[group]));
						
						dayMode = "<span class=\"mode-content\">" + this.getAliasOrNot(days + " " + time) + "</span>";
						
						modeList.push(dayMode);
					}
				}

				return "<span class=\"mode\">" + modeList.join("</span>" + "<span class=\"mode-delimeter\">" + this.modeDelimeter + "</span>" + "<span class=\"mode\">") + "</span>";
			},
			
			/**
			 * Render modes.
			 */
			renderModes: function (modes) {
				var 
					renderedModes = [],
					modesToRender = [];

				for (var i = 0, l = modes.length, list; i < l; i++) {
					list = modes[i].list;

					for (var j = 0, m = list.length; j < m; j++) {
						if (j > 0 && list[j - 1].modeDigest != list[j].modeDigest) {
							renderedModes.push(this.renderMode(modesToRender));
							
							modesToRender = []; //reset!
							modesToRender.push(list[j].mode);
						} else {
							modesToRender.push(list[j].mode);
						}
					}
				}
				
				if (modesToRender.length) {
					renderedModes.push(this.renderMode(modesToRender));
				}
				
				return "<span class=\"modes\">" + renderedModes.join("</span>" + "<span class=\"modes-delimeter\">" + this.modesDelimeter + "</span>" + "<span class=\"modes\">") + "</span>";
			},
			
			/**
			 * Render one type.
			 */
			renderType: function (types) {
				var 
					renderedTypes = [],
					label = "",
					last = "",
					names = [],
					equalYes = [],
					equalNo = [];

				for (var i = 0, l = types.length, form, obj; i < l; i++) {
					//plural form or not
					form = types[i].list.length > 1 ? 1 : 0;

					names.push(typeof this.typeNames[types[i].type] != "undefined" ? this.typeNames[types[i].type][form] : types[i].type);

					obj = types[i];
					if (types[i].listModesIsEqual) {
						equalYes.push(obj);
					} else {
						equalNo.push(obj);
					}
				}

				if (names.length > 1) {
					last = this.typeDelimeterLast + names.pop();
				}
				
				if (names.join("").length) {
					label = names.join(this.typeDelimeter) + last;
					label = label.charAt(0).toUpperCase() + label.substring(1);
					
					label = "<span class=\"type-content-label\">" + label + "</span>" + "<span class=\"type-content-label-postfix\">" + this.typePostfix + "</span>"; 
				}
				
				if (equalYes.length) {
					renderedTypes.push(this.renderModes(equalYes));
				}
				
				for (var i = 0, l = equalNo.length; i < l; i++) {
					renderedTypes.push(this.renderModes([equalNo[i]]));
				}

				return "<span class=\"type-content\">" + label + renderedTypes.join("") + "</span>";
			},

			/**
			 * Render types.
			 */
			renderTypes: function (types) {
				types = utils.objectToArray(types, "modeDigest");

				var 
					renderedTypes = [],
					typesToRender = [];
				
				for (var i = 0; i < types.length; i++) {
					if (i > 0 && types[i - 1].modeDigest != types[i].modeDigest) {
						renderedTypes.push(this.renderType(typesToRender));
						
						typesToRender = []; //reset!
						typesToRender.push(types[i]);
					} else {
						typesToRender.push(types[i]);
					}
				}
				
				if (typesToRender.length) {
					renderedTypes.push(this.renderType(typesToRender));
				}
				
				return "<div class=\"types\"><div class=\"type\">" + renderedTypes.join("</div><div class=\"type\">") + "</div></div>";
			},

			/**
			 * Format time string.
			 */
			renderTime: function (s) {
				var 
					time = "",
					times = s.split(";");
				
				for (var i = 0, l = times.length, len; i < l; i++) {
					var len = times[i].toString().length;
					
					if (len > 0 && len != 5) {
						times[i] = "0" + times[i];
					}
				}

				time = times[0] + this.dash + times[1];

				//add time-out
				if (times.length > 2 && (times[2] != "" && times[3] != "")) {
					time += " <span class=\"mode-content-timeout\">(" + times[2] + this.dash + times[3] + ")</span>";
				}

				return time.replace(/\./g, ":");
			},
			
			/**
			 * Make alias for string (if exists).
			 */
			getAliasOrNot: function (s) {
				if (typeof this.aliases[s] != "undefined") {
					return this.aliases[s];
				}
				
				console.log(s)
				
				return s;
			},

			/**
			 * Check date is valid.
			 */
			isValidDate: function (s) {
				var parts = s.split(";");
				
				if (parts.length >= 2) { // very simple check
					if (parts[0] != "" && parts[1] != "") {
						return true;
					}
				}

				return false;
			},

			/**
			 * Before render objects builder.
			 */
			postInit: function () {
				var 
					everyhour = "00:00" + this.dash + "24:00",
					everyday = this.dayNames[0] + this.daysIntervalDelimeter + this.dayNames[6],
					rtc = this.noctidialName;
				
				this.aliases[everyday + " " + everyhour] = rtc;
				this.aliases[everyday + " " + rtc] = rtc;
				this.aliases[everyhour] = rtc;

				//add (missed) right space
				var params = ["typeDelimeter", "typePostfix", "modesDelimeter", "modeDelimeter", "typeDelimeterLast"];
				for (var i = 0, l = params.length, key, lspace, rspace; i < l; i++) {
					key = params[i], 
					lspace = "", 
					rspace = " ";
					
					if (key in this) {
						if (key == "typeDelimeterLast") {
							lspace = " ";
						}
						
						this[key] = lspace + utils.trim(this[key]) + rspace;
					}
				}
			},
			
			/**
			 * Render out.
			 */
			render: function () {
				this.postInit();
			
				this.types = this.buildTypes(this.types);

				return this.renderTypes(this.types);
			}
		};

		return (function (opts) {
			if (typeof opts != "undefined") {
				formatter.typeNames = opts.typeNames || formatter.typeNames;
				
				formatter.dayNames = opts.dayNames || formatter.dayNames;
				
				formatter.noctidialName = opts.noctidialName || formatter.noctidialName;
				
				formatter.typeDelimeterLast = opts.typeDelimeterLast || formatter.typeDelimeterLast;
			}

			this.render = function (types) {
				formatter.types = types;
				
				return formatter.render();
			};
			
			this.renderModes = function (modes) {
				formatter.types = {"": [{"mode": modes}]};
				
				return formatter.render();
			};
		});
})();

