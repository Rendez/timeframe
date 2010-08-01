/* Timeframe, version 0.3.1
* (c) 2008 Stephen Celis
*
* Freely distributable under the terms of an MIT-style license. 
* ------------------------------------------------------------- */

// Checks for localized Datejs before defaulting to 'en-US'

(function(){

var Timeframes = [];

var Timeframe = this.Timeframe = new Class({
	
	Version: '0.3',

	Implements: [Options, Events],

	initialize: function(element, options) {
		Timeframes.push(this);

		this.element = document.id(element);
		this.element.addClass('timeframe-calendar');
		this.setOptions($merge({ months: 2 }, options || {}));
		this.months = this.options.months;

		this.weekdayNames = MooTools.lang.get('Date', 'days');
		this.monthNames   = MooTools.lang.get('Date', 'months');
		this.format       = this.options.format || MooTools.lang.get('Date', 'shortDate');
		this.weekOffset   = this.options.weekOffset || MooTools.lang.get('Date', 'weekOffset') || 0;
		this.maxRange     = this.options.maxRange;

		this.firstDayId = this.element.id + '-firstday';
		this.lastDayId  = this.element.id + '-lastday';

		this.scrollerDelay = 0.5;

		this.buttons = $H({
			previous: $H({ label: '&larr;', element: document.id(this.options.previousButton) }),
			today:    $H({ label: 'T',      element: document.id(this.options.todayButton) }),
			reset:    $H({ label: 'R',      element: document.id(this.options.resetButton) }),
			next:     $H({ label: '&rarr;', element: document.id(this.options.nextButton) })
		})
		this.fields = $H({ start: document.id(this.options.startField), end: document.id(this.options.endField) });

		this.range = $H({});
		this.earliest = Date.parse(this.options.earliest).neutral();
		this.latest   = Date.parse(this.options.latest).neutral();
		
		if (this.earliest && this.latest && this.earliest > this.latest)
		throw new Error("Timeframe: 'earliest' cannot come later than 'latest'");

		this._buildButtons()._buildFields();

		this.calendars = [];
		this.element.grab(new Element('div', { id: this.element.id + '-container' }));
		this.months.times(function(month){ this.createCalendar(month); }.bind(this));
		
		this.calendars[0].getElements('td')[0].id = this.firstDayId;
		this.calendars.getLast().getElements('td').getLast().id = this.lastDayId;

		this.register().populate().refreshRange();
	},

	// Scaffolding
	createCalendar: function() {
		var calendar = new Element('table', {
			id: this.element.id + '-calendar-' + this.calendars.length, border: 0, cellspacing: 0, cellpadding: 5
		});
		calendar.grab(new Element('caption'));

		var head = new Element('thead');
		var row  = new Element('tr');
		this.weekdayNames.length.times(function(column) {
			var weekday = this.weekdayNames[(column + this.weekOffset) % 7];
			var cell = new Element('th', { scope: 'col', abbr: weekday }).set('text', weekday.substring(0,1));
			row.grab(cell);
		}.bind(this));
		head.grab(row);
		calendar.grab(head);

		var body = new Element('tbody');
		(6).times(function(rowNumber) {
			var row = new Element('tr');
			this.weekdayNames.length.times(function(column) {
				var cell = new Element('td');
				row.grab(cell);
			});
			body.grab(row);
		}.bind(this));
		calendar.grab(body);

		this.element.getElement('div#' + this.element.id + '-container').grab(calendar);
		this.calendars.push(calendar);
		this.months = this.calendars.length;

		return this;
	},

	destroyCalendar: function() {
		this.calendars.pop().remove();
		this.months = this.calendars.length;
		
		return this;
	},

	populate: function() {
		var month = this.date.neutral();
		month.setDate(1);

		if (this.earliest === null || this.earliest < month)
		this.buttons.get('previous').get('element').removeClass('disabled');
		else
		this.buttons.get('previous').get('element').addClass('disabled');

		this.calendars.each(function(calendar) {
			var caption = calendar.getElements('caption')[0];
			caption.set('html', this.monthNames[month.getMonth()] + ' ' + month.getFullYear());

			var iterator = new Date(month);
			var offset = (iterator.getDay() - this.weekOffset) % 7;
			var inactive = offset > 0 ? 'pre beyond' : false;
			iterator.setDate(iterator.getDate() - offset);
			if (iterator.getDate() > 1 && !inactive) {
				iterator.setDate(iterator.getDate() - 7);
				if (iterator.getDate() > 1) inactive = 'pre beyond';
			}

			calendar.getElements('td').each(function(day) {
				day.store('timeframe:date', new Date(iterator)); // Is this expensive (we unload these later)? We could store the epoch time instead.
				day.set('html', day.retrieve('timeframe:date').getDate()).setProperty('class', inactive || 'active');
				if ((this.earliest && day.retrieve('timeframe:date') < this.earliest) || (this.latest && day.retrieve('timeframe:date') > this.latest))
				day.addClass('unselectable');
				else
				day.addClass('selectable');
				if (iterator.toString() === new Date().neutral().toString()) day.addClass('today');
				day.baseClass = day.getProperty('class');

				iterator.setDate(iterator.getDate() + 1);
				if (iterator.getDate() == 1) inactive = inactive ? false : 'post beyond';
			}.bind(this));

			month.setMonth(month.getMonth() + 1);
		}.bind(this));

		if (this.latest === null || this.latest > month)
		this.buttons.get('next').get('element').removeClass('disabled');
		else
		this.buttons.get('next').get('element').addClass('disabled');

		return this;
	},

	_buildButtons: function() {
		var buttonList = new Element('ul', { id: this.element.id + '-menu', 'class': 'timeframe-menu' });
		this.buttons.each(function(pair, key) {
			if (pair.get('element'))
			pair.get('element').addClass('timeframe-button').addClass(key);
			else {
				var item = new Element('li');
				var button = new Element('a', {
					'class': 'timeframe-button ' + key,
					href: '#',
					events: {
						'click': function(event){ event.preventDefault(); }
					}
				}).set('html', pair.get('label'));
				pair.set('element', button);
				item.grab(button);
				buttonList.grab(item);
			}
		}.bind(this))
		if (buttonList.childNodes.length > 0) buttonList.inject(this.element, 'top');
		this.clearButton = new Element('span', {'class': 'clear'}).adopt(new Element('span', {'text': 'X'}));
		return this;
	},

	_buildFields: function() {
		var fieldset = new Element('div', { id: this.element.id + '-fields', 'class': 'timeframe-fields' });
		this.fields.each(function(value, key) {
			if (value) value.addClass('timeframe-field').addClass(key);
			else {
				var container = new Element('div', { id: key + this.element.id + '-field-container' });
				this.fields.set(key, new Element('input', { id: this.element.id + '-' + key + 'field', name: key + 'field', type: 'text', value: '' }));
				container.grab(new Element('label', { 'for': key + 'field' }).set('text', key));
				container.grab(this.fields.get(key));
				fieldset.grab(container);
			}
		}.bind(this));
		if (fieldset.childNodes.length > 0) this.element.grab(fieldset);
		this.parseField('start').refreshField('start').parseField('end').refreshField('end').initDate = new Date(this.date);
		return this;
	},

	// Event registration
	register: function() {
		document.addEvent('click', this.eventClick.bindWithEvent(this));
		this.element.addEvent('mousedown', this.eventMouseDown.bindWithEvent(this));
		this.element.addEvent('mouseover', this.eventMouseOver.bindWithEvent(this));
		document.id(this.firstDayId).addEvent('mouseout', this.clearTimer.bind(this));
		document.id(this.lastDayId).addEvent('mouseout', this.clearTimer.bind(this));
		document.addEvent('mouseup', this.eventMouseUp.bindWithEvent(this));
		document.addEvent('unload', this.unregister.bind(this));
		// mousemove listener for Opera in _disableTextSelection
		return this._registerFieldObserver('start')._registerFieldObserver('end')._disableTextSelection();
	},

	unregister: function() {
		this.element.getElements('td').each(function(day) { day.retrieve('timeframe:date', day.baseClass = null); });
	},

	_registerFieldObserver: function(fieldName) {
		var field = this.fields.get(fieldName);
		field.addEvent('focus', function() { field.hasFocus = true; this.parseField(fieldName, true); }.bind(this));
		field.addEvent('blur', function() { this.refreshField(fieldName); }.bind(this));
		new Listener(field, function(value, element){ if (element.hasFocus) this.parseField(fieldName, true); }.bind(this), {delay: 200});
		
		return this;
	},

	_disableTextSelection: function() {
		if (Browser.Engine.trident) {
			this.element.onselectstart = function(event) {
				if (!event || !event.target) return false;
					if (!/input|textarea/i.test(event.target.tagName)) return false;
			};
		} else if (Browser.Engine.presto) {
			document.addEvent('mousemove', this.handleMouseMove.bind(this));
		} else {
			this.element.onmousedown = function(event) {
				if (!/input|textarea/i.test(event.target.tagName)) return false;
			};
		}
		return this;
	},

	// Fields
	parseField: function(fieldName, populate) {
		var field = this.fields.get(fieldName);
	    var date = Date.parse(this.fields.get(fieldName).get('value'));
	    var failure = (date) ? this.validateField(fieldName, date = date.neutral()) : 'hard';
		if (failure != 'hard') {
			this.range.set(fieldName, date);
			field.removeClass('error');
		} else if (field.hasFocus)
			field.addClass('error');
		var date = Date.parse(this.range.get(fieldName)).neutral();
		this.date = date || new Date();
		if (this.earliest && this.earliest > this.date) {
			this.date = new Date(this.earliest);
		} else if (this.latest) {
			date = new Date(this.date);
			date.setMonth(date.getMonth() + (this.months - 1));
			if (date > this.latest) {
				this.date = new Date(this.latest);
				this.date.setMonth(this.date.getMonth() - (this.months - 1));
			}
		}
		this.date.setDate(1);
		if (populate && date) this.populate();
		this.refreshRange();
		
		return this;
	},

	refreshField: function(fieldName) {
		var field = this.fields.get(fieldName);
		var initValue = field.get('value');
		if (this.range.get(fieldName)) {
			field.set('value', typeof MooTools.lang.get('Date') != 'undefined'
				? this.range.get(fieldName).strftime(this.format)
				: this.range.get(fieldName).toString(this.format));
		} else
			field.set('value', '');
		field.hasFocus && field.get('value') == '' && initValue != '' ? field.addClass('error') : field.removeClass('error');
		field.hasFocus = false;
		
		return this;
	},

	validateField: function(fieldName, date) {
		if (!date) return;
		
		var error;
		if (/invalid date/i.test(date))
			error = 'hard';
		else if ((this.earliest && date < this.earliest) || (this.latest && date > this.latest))
			error = 'hard';
		else if (fieldName == 'start' && this.range.get('end') && date > this.range.get('end'))
			error = 'soft';
		else if (fieldName == 'end' && this.range.get('start') && date < this.range.get('start'))
			error = 'soft';
		
		return error;
	},

	// Event handling
	eventClick: function(event) {
		if (!Element(event.target).getParents()) return;
		var el;
		if (el = event.findElement('a.timeframe-button'))
			this.handleButtonClick(event, el);
	},

	eventMouseDown: function(event) {
		if (!Element(event.target).getParents()) return;
		var el, em;
		if (el = event.findElement('span.clear')) {
			el.getElement('span').addClass('active');
			if (em = event.findElement('td.selectable'))
				this.handleDateClick(em, true);
		} else if (el = event.findElement('td.selectable'))
			this.handleDateClick(el);
		else return;
	},

	handleButtonClick: function(event, element) {
		var el;
		var movement = this.months > 1 ? this.months - 1 : 1;
		if (element.hasClass('next')) {
			if (!this.buttons.get('next').get('element').hasClass('disabled'))
				this.date.setMonth(this.date.getMonth() + movement);
		} else if (element.hasClass('previous')) {
			if (!this.buttons.get('previous').get('element').hasClass('disabled'))
				this.date.setMonth(this.date.getMonth() - movement);
		} else if (element.hasClass('today'))
			this.date = new Date();
		else if (element.hasClass('reset'))
			this.reset();
		this.populate().refreshRange();
	},

	reset: function() {
		this.fields.get('start').set('value', this.fields.get('start').defaultValue || '');
		this.fields.get('end').set('value', this.fields.get('end').defaultValue || '');
		this.date = new Date(this.initDate);
		this.parseField('start').refreshField('start').parseField('end').refreshField('end');
	},

	clear: function() {
		this.clearRange();
		this.refreshRange();
	},

	handleDateClick: function(element, couldClear) {
		this.mousedown = this.dragging = true;
		if (this.stuck) {
			this.stuck = false;
			return;
		} else if (couldClear) {
			if (!element.hasClass('startrange')) return;
		} else if (this.maxRange != 1) {
			this.stuck = true;
			setTimeout(function(){ if (this.mousedown) this.stuck = false; }.bind(this), 200);
		}
		this.getPoint(element.retrieve('timeframe:date'));
	},

	getPoint: function(date) {
		if (this.range.get('start') && this.range.get('start').toString() == date && this.range.get('end'))
			this.startdrag = this.range.get('end');
		else {
			this.clearButton.hide();
			if (this.range.get('end') && this.range.get('end').toString() == date)
				this.startdrag = this.range.get('start');
			else {
				this.range.set('start', this.range.set('end', date).get('end'));
				this.startdrag = date;
			}
		}
		this.refreshRange();
	},

	eventMouseOver: function(event) {
		var el;
		if (!this.dragging)
			this.toggleClearButton(event);
		else if (event.findElement('span.clear,span.active'));
		else if (el = event.findElement('td.selectable')) {
			this.clearTimer();
			if (el.id == this.lastDayId) {
				this.timer = (function() {
					if (!this.buttons.get('next').get('element').hasClass('disabled')) {
						this.date.setMonth(this.date.getMonth() + 1);
						this.populate().refreshRange();
					}
				}).create({bind: this, periodical: this.scrollerDelay * 1000})();
			} else if (el.id == this.firstDayId) {
				this.timer = (function() {
					if (!this.buttons.get('previous').get('element').hasClass('disabled')) {
						this.date.setMonth(this.date.getMonth() - 1);
						this.populate().refreshRange();
					}
				}).create({bind: this, periodical: this.scrollerDelay * 1000})();
			}
			this.extendRange(el.retrieve('timeframe:date'));
		} else
			this.toggleClearButton(event);
	},

	clearTimer: function(event) {
		this.timer = $clear(this.timer);
		
		return this;
	},

	toggleClearButton: function(event) {
		var el;
		if (event.target.getSiblings() && event.findElement('td.selected')) {
			if (el = this.element.getElement('#' + this.calendars[0].id +  ' .pre.selected'));
			else if (el = this.element.getElement('.active.selected'));
			else if (el = this.element.getElement('.post.selected'));
			if (el) this.clearButton.inject(el, 'top');
			this.clearButton.show().getElement('span').removeClass('active');
		} else
			this.clearButton.hide();
	},

	extendRange: function(date) {
		var start, end;
		this.clearButton.hide();
		if (date > this.startdrag) {
			start = this.startdrag;
			end = date;
		} else if (date < this.startdrag) {
			start = date;
			end = this.startdrag;
		} else
			start = end = date;
		this.validateRange(start, end);
		this.refreshRange();
	},

	validateRange: function(start, end) {
		if (this.maxRange) {
			var range = this.maxRange - 1;
			var days = parseInt((end - start) / 86400000);
			if (days > range) {
				if (start == this.startdrag) {
					end = new Date(this.startdrag);
					end.setDate(end.getDate() + range);
				} else {
					start = new Date(this.startdrag);
					start.setDate(start.getDate() - range);
				}
			}
		}
		this.range.set('start', start);
		this.range.set('end', end);
	},

	eventMouseUp: function(event) {
		if (!this.dragging) return;
		if (!this.stuck) {
			this.dragging = false;
 			if (event.findElement('span.clear,span.active'))
				this.clearRange();
			if (this.timer)
				this.clearTimer();
		}
		this.mousedown = false;
		this.refreshRange();
	},

	clearRange: function() {
		this.clearButton.hide().getElement('span').removeClass('active');
		this.range.set('start', this.range.set('end', null).get('end'));
		this.refreshField('start').refreshField('end');
		this.fireEvent('onClear');
	},

	refreshRange: function() {
		this.element.getElements('td').each(function(day) {
			day.setProperty('class', day.baseClass);
			if (this.range.get('start') && this.range.get('end') && this.range.get('start') <= day.retrieve('timeframe:date') && day.retrieve('timeframe:date') <= this.range.get('end')) {
				var baseClass = day.hasClass('beyond') ? 'beyond-' : day.hasClass('today') ? 'today-' : null;
				var state = this.stuck || this.mousedown ? 'stuck' : 'selected';
				if (baseClass) day.addClass(baseClass + state);
				day.addClass(state);
				var rangeClass = '';
				if (this.range.get('start').toString() == day.retrieve('timeframe:date')) rangeClass += 'start';
				if (this.range.get('end').toString() == day.retrieve('timeframe:date')) rangeClass += 'end';
				if (rangeClass.length > 0) day.addClass(rangeClass + 'range');
			}
			if (Browser.Engine.presto) {
				day.unselectable = 'on'; // Trick Opera into refreshing the selection (FIXME)
				day.unselectable = null;
			}
		}.bind(this));
		if (this.dragging) this.refreshField('start').refreshField('end');
	},

	setRange: function(start, end) {
		var range = $H({start: start, end: end});
		range.each(function(value, key) {
			this.range.set(key, Date.parse(value).neutral());
			this.refreshField(key);
			this.parseField(key, true);
		}.bind(this));
		
		return this;
	},

	handleMouseMove: function(event) {
		if (event.target.getSiblings('#' + this.element.id + ' td')) window.getSelection().removeAllRanges(); // More Opera trickery
	}
});

Date.implement('neutral', function(){
	return new Date(this.getFullYear(), this.getMonth(), this.getDate(), 12);
});

Event.implement('findElement', function(selector){
	var siblings = this.target.getParent().getElements(selector);
	var els = siblings.filter(function(sibling){
		return (sibling === this) ? true : false;
	}.bind(this.target));
	return els[0] || this.target.getParents(selector)[0];
});

})();