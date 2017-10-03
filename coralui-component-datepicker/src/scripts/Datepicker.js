/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

import Component from 'coralui-mixin-component';
import FormField from 'coralui-mixin-formfield';
import {DateTime} from 'coralui-datetime';
import {Button} from 'coralui-component-button';
import 'coralui-component-clock';
import 'coralui-component-calendar';
import 'coralui-component-popover';
import 'coralui-component-textfield';
import base from '../templates/base';
import popoverContent from '../templates/popoverContent';
import {transform, commons, validate, i18n} from 'coralui-util';

/**
 Enum for Datepicker variant values.
 
 @enum {String}
 @memberof Coral.Datepicker
 */
const variant = {
  /** A default, gray Datepicker. */
  DEFAULT: 'default',
  /** A Datepicker with no border or background. */
  QUIET: 'quiet'
};

const CLASSNAME = 'coral-InputGroup';

// builds a string containing all possible variant classnames. This will be used to remove
// classnames when the variant changes.
const ALL_VARIANT_CLASSES = [];
for (const variantKey in variant) {
  ALL_VARIANT_CLASSES.push(CLASSNAME + '--' + variant[variantKey]);
}

/** @ignore */
function toMoment(value, format) {
  if (value === 'today') {
    return new DateTime.Moment();
  }
  else if (DateTime.Moment.isMoment(value)) {
    return value.isValid() ? value.clone() : null;
  }
  else {
    // if the value provided is a date it does not make sense to provide a format to parse the date
    const result = new DateTime.Moment(value, value instanceof Date ? null : format);
    return result.isValid() ? result : null;
  }
}

/**
 Datepicker types.
 
 @enum {String}
 @memberof Coral.Datepicker
 */
const type = {
  /** The selection overlay contains only a calendar. */
  DATE: 'date',
  /** Provides both calendar and time controls in the selection overlay. */
  DATETIME: 'datetime',
  /** The selection overlay provides only time controls */
  TIME: 'time'
};

// Used to determine if the client is on a mobile device
const IS_MOBILE_DEVICE = navigator.userAgent.match(/iPhone|iPad|iPod|Android/i) !== null;

const NATIVE_FORMATS = {
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD[T]HH:mmZ',
  time: 'HH:mm'
};

const isNativeFormat = (format) => {
  let res = false;
  for (let key in NATIVE_FORMATS) {
    if (format === NATIVE_FORMATS[key]) {
      res = true;
    }
  }
  return res;
};

/**
 @class Coral.Datetime
 @classdesc A Datetime component
 @htmltag coral-datetime
 @extends HTMLElement
 @extends Coral.mixin.component
 @extends Coral.mixin.formField
 */
class Datetime extends FormField(Component(HTMLElement)) {
  constructor() {
    super();
    
    // Events
    this._delegateEvents(commons.extend(this._events, {
      'click coral-calendar': '_onCalendarDayClick',
      'change coral-calendar,coral-clock': '_onChange',
  
      'coral-overlay:beforeopen [handle="popover"]': '_onPopoverBeforeOpen',
      'coral-overlay:open [handle="popover"]': '_onPopoverOpenOrClose',
      'coral-overlay:close [handle="popover"]': '_onPopoverOpenOrClose',
  
      'key:esc coral-clock input[is=coral-textfield]': '_onEscapeKey',
      'key:alt+down [handle="input"],[handle="toggle"]': '_onAltDownKey',
      'key:down [handle="toggle"]': '_onAltDownKey'
    }));
    
    // Prepare templates
    this._elements = {};
    base.call(this._elements);
    // Creates and stores the contents of the popover separately
    this._calendarFragment = popoverContent.call(this._elements);
  }
  
  /**
   The type of datepicker to show to the user.
   
   See {@link Coral.Datepicker.type}
   
   @type {Coral.Datepicker.type}
   @default Coral.Datepicker.type.DATE
   @htmlattribute type
   @htmlattributereflected
   @memberof Coral.Datepicker#
   */
  get type() {
    return this._type || type.DATE;
  }
  set type(value) {
    // Flag to indicate that we are changing the type for the first time
    this._typeFormatChanged = typeof this._type === 'undefined';
    
    value = transform.string(value).toLowerCase();
    this._type = validate.enumeration(type)(value) && value || type.DATE;
    this._reflectAttribute('type', this._type);
  
    const format = NATIVE_FORMATS[this._type];
    const isTime = this._type === type.TIME;
    const isDate = this._type === type.DATE;
  
    this._elements.toggle.icon = isTime ? 'clock' : 'calendar';
  
    const toggleLabel = isTime ? i18n.get('Time') : i18n.get('Calendar');
    this._elements.toggle.setAttribute('aria-label', toggleLabel);
    this._elements.toggle.setAttribute('title', toggleLabel);
  
    this._elements.clockContainer.style.display = !isDate ? '' : 'none';
    this._elements.clockContainer.setAttribute('aria-hidden', isDate);
  
    this._elements.calendar.style.display = isTime ? 'none' : '';
    this._elements.calendar.setAttribute('aria-hidden', isTime);
    
    // Change format if we have a native format set
    if (isNativeFormat(this.valueFormat)) {this.valueFormat = format;}
    if (isNativeFormat(this.displayFormat)) {this.displayFormat = format;}
    
    this._useNativeInput = this._useNativeInput;
  
    this._typeFormatChanged = false;
  }
  
  /**
   The format used to display the selected date(time) to the user. If the user manually types a date, this format
   will be used to parse the value. When using this component on a mobile device, the display format must follow
   the format used by the native input. If an empty string is provided, then the default value per type will
   be used. The default value depends on the <code>type</code>, which can be one from <code>YYYY-MM-DD</code>,
   <code>YYYY-MM-DD[T]HH:mmZ</code> or <code>HH:mm</code>.  Include momentjs to support additional format string options
   see http://momentjs.com/docs/#/displaying/.
   
   @type {String}
   @default "YYYY-MM-DD"
   @htmlattribute displayformat
   @htmlattributereflected
   @memberof Coral.Datepicker#
   */
  get displayFormat() {
    // we ignore _useNativeInput when the type is datetime because it is not supported by mobile libraries
    if (this._useNativeInput && this.type !== type.DATETIME) {
      return NATIVE_FORMATS[this.type];
    }
    else {
      return typeof this._displayFormat === 'undefined' ? NATIVE_FORMATS[this.type] : this._displayFormat;
    }
  }
  set displayFormat(value) {
    value = transform.string(value).trim();
  
    // In case a custom display format was set, we make sure that type doesn't change it to a native format
    const displayFormatAttribute = this.getAttribute('displayformat');
    if (this._typeFormatChanged && displayFormatAttribute && displayFormatAttribute !== value) {
      value = displayFormatAttribute;
    }
    
    this._displayFormat = value === '' ? NATIVE_FORMATS[this.type] : value;
    this._reflectAttribute('displayformat', this._displayFormat);
    
    this._elements.clock.displayFormat = this._displayFormat;
    this._elements.input.value = this._getValueAsString(this._value, this._displayFormat);
  }
  
  /**
   The format to use on expressing the selected date as a string on the <code>value</code> attribute. The value
   will be sent to the server using this format. If an empty string is provided, then the default value per type
   will be used. The default value depends on the <code>type</code>, which can be one from <code>YYYY-MM-DD</code>,
   <code>YYYY-MM-DD[T]HH:mmZ</code> or <code>HH:mm</code>. Include momentjs to support additional format string options
   see http://momentjs.com/docs/#/displaying/.
   
   @type {String}
   @default "YYYY-MM-DD"
   @htmlattribute valueformat
   @htmlattributereflected
   @memberof Coral.Datepicker#
   */
  get valueFormat() {
    return typeof this._valueFormat === 'undefined' ? NATIVE_FORMATS[this.type] : this._valueFormat;
  }
  set valueFormat(value) {
    const setValueFormat = (newValue) => {
      this._valueFormat = newValue === '' ? NATIVE_FORMATS[this.type] : newValue;
      this._reflectAttribute('valueformat', this._valueFormat);
    };
  
    value = transform.string(value).trim();
  
    // In case a custom display format was set, we make sure that type doesn't change it to a native format
    const valueFormatAttribute = this.getAttribute('valueformat');
    if (this._typeFormatChanged && valueFormatAttribute && valueFormatAttribute !== value) {
      value = valueFormatAttribute;
    }
  
    // Once the valueFormat is set, we make sure the value is also correct
    if (!this._valueFormat && this._originalValue) {
      setValueFormat(value);
      this.value = this._originalValue;
    }
    else {
      setValueFormat(value);
    }
    
    this._elements.calendar.valueFormat = this._valueFormat;
    this._elements.hiddenInput.value = this.value;
  }
  
  /**
   The value of the element, interpreted as a date, or <code>null</code> if conversion is not possible.
   
   @type {Date}
   @default null
   @memberof Coral.Datepicker#
   */
  get valueAsDate() {
    let value = this._value;
  
    // If type is DATE, then you strip out the time
    if (this.type === 'date' && value) {
      value = value.startOf('day');
    }
  
    return value ? value.toDate() : null;
  }
  set valueAsDate(value) {
    this._valueAsDate = (value instanceof Date) ? new DateTime.Moment(value) : '';
  
    this.value = this._valueAsDate;
  }
  
  /**
   The minimum date that the Datepicker will accept as valid. It must not be greated that its maximum. It accepts
   both date and string values. When a string is provided, it should match the {@link Coral.Datepicker#valueFormat}.
   
   See {@link Coral.Calendar#min}
   
   @type {String|Date}
   @default null
   @htmlattribute min
   @memberof Coral.Datepicker#
   */
  get min() {
    return this._elements.calendar.min;
  }
  set min(value) {
    this._elements.calendar.min = value;
  }
  
  /**
   The maximum date that the Datepicker will accept as valid. It must not be less than its minimum. It accepts both
   date and string values. When a string is provided, it should match the {@link Coral.Datepicker#valueFormat}.
   
   See {@link Coral.Calendar#max}
   
   @type {String|Date}
   @default null
   @htmlattribute max
   @memberof Coral.Datepicker#
   */
  get max() {
    return this._elements.calendar.max;
  }
  set max(value) {
    this._elements.calendar.max = value;
  }
  
  /**
   The format used to display the current month and year.
   'MMMM YYYY' is supported by default. Include momentjs to support additional format string options see
   http://momentjs.com/docs/#/displaying/.
   
   See {@link Coral.Calendar#startDay}
   
   @type {String}
   @default "MMMM YYYY"
   @htmlattribute headerformat
   @memberof Coral.Datepicker#
   */
  get headerFormat() {
    return this._elements.calendar.headerFormat;
  }
  set headerFormat(value) {
    this._elements.calendar.headerFormat = value;
  }
  
  /**
   Defines the start day for the week, 0 = Sunday, 1 = Monday etc., as depicted on the calendar days grid.
   
   See {@link Coral.Calendar#startDay}
   
   @type {Number}
   @default 0
   @htmlattribute startday
   @memberof Coral.Datepicker#
   */
  get startDay() {
    return this._elements.calendar.startDay;
  }
  set startDay(value) {
    this._elements.calendar.startDay = value;
  }
  
  /**
   The current value. When set to "today", the value is coerced into the client's local date expressed as string
   formatted in accordance to the set <code>valueFormat</code>.
   
   See {@link Coral.Calendar#value}
   
   @type {String}
   @default ""
   @fires Coral.mixin.formField#change
   @htmlattribute value
   @memberof Coral.Datepicker#
   */
  get value() {
    return this._getValueAsString(this._value, this.valueFormat);
  }
  set value(value) {
    // This is used to change the value if valueformat is also set but afterwards
    this._originalValue = value;
    
    this._value = toMoment(value, this.valueFormat);
  
    this._elements.calendar.valueAsDate = this.valueAsDate;
    this._elements.clock.valueAsDate = this.valueAsDate;
    this._elements.input.value = this._getValueAsString(this._value, this.displayFormat);
    this._elements.hiddenInput.value = this.value;
  }
  
  /**
   Short hint that describes the expected value of the Datepicker. It is displayed when the Datepicker is empty.
   
   @type {String}
   @default ""
   @htmlattribute placeholder
   @htmlattributereflected
   @memberof Coral.Datepicker#
   */
  get placeholder() {
    return this._elements.input.placeholder;
  }
  set placeholder(value) {
    this._elements.input.placeholder = value;
    this._reflectAttribute('placeholder', this.placeholder);
  }
  
  /**
   The datepicker's variant.
   
   @type {Coral.Datepicker.variant}
   @default Coral.Datepicker.variant.DEFAULT
   @htmlattribute variant
   @htmlattributereflected
   @memberof Coral.Datepicker#
   */
  get variant() {
    return this._variant || variant.DEFAULT;
  }
  set variant(value) {
    value = transform.string(value).toLowerCase();
    this._variant = validate.enumeration(variant)(value) && value || variant.DEFAULT;
  
    // passes down the variant to the underlying components
    // we have to do this because default of button is not 'default', but 'secondary'
    this._elements.toggle.variant = this._variant === variant.DEFAULT ? Button.variant.DEFAULT : Button.variant.QUIET;
    this._elements.input.variant = this._variant;
  
    // removes every existing variant
    this.classList.remove.apply(this.classList, ALL_VARIANT_CLASSES);
  
    if (this._variant !== variant.DEFAULT) {
      this.classList.add(`${CLASSNAME}--${this._variant}`);
    }
  }
  
  // JSDoc inherited
  get name() {
    return this._elements.hiddenInput.name;
  }
  set name(value) {
    this._reflectAttribute('name', value);
  
    this._elements.hiddenInput.name = value;
  }
  
  // JSDoc inherited
  get disabled() {
    return this._disabled || false;
  }
  set disabled(value) {
    this._disabled = transform.booleanAttr(value);
    this._reflectAttribute('disabled', this._disabled);
    
    this.setAttribute('aria-disabled', this._disabled);
    this.classList.toggle('is-disabled', this._disabled);
  
    this._elements.input.disabled = this._disabled;
    this._elements.hiddenInput.disabled = this._disabled;
    this._elements.toggle.disabled = this._disabled || this.readOnly;
  }
  
  // JSDoc inherited
  get invalid() {
    return super.invalid;
  }
  set invalid(value) {
    super.invalid = value;
    
    this.classList.toggle('is-invalid', this.invalid);
    this._elements.input.invalid = this.invalid;
    this._elements.input.setAttribute('aria-invalid', this.invalid);
  }
  
  // JSDoc inherited
  get required() {
    return this._required || false;
  }
  set required(value) {
    this._required = transform.booleanAttr(value);
    this._reflectAttribute('required', this._required);
    
    this.setAttribute('aria-required', this._required);
  
    this._elements.input.required = this._required;
  }
  
  // JSDoc inherited
  get readOnly() {
    return this._readOnly || false;
  }
  set readOnly(value) {
    this._readOnly = transform.booleanAttr(value);
    this._reflectAttribute('readonly', this._readOnly);
    this.setAttribute('aria-readonly', this._readOnly);
  
    this._elements.input.readOnly = this._readOnly;
    this._elements.toggle.disabled = this._readOnly || this.disabled;
  }
  
  // JSDoc inherited
  get labelledBy() {
    return super.labelledBy;
  }
  set labelledBy(value) {
    super.labelledBy = value;
    
    // in case the user focuses the buttons, he will still get a notion of the usage of the component
    this[this.labelledBy ? 'setAttribute' : 'removeAttribute']('aria-labelledby', this.labelledBy);
  }
  
  /**
   When <code>true</code> the component will default to the native input for the date selection. When
   {@link Coral.Datepicker.type.DATETIME} has been set, it will still use the Coral way because mobile browsers
   cannot handle a datetime input.
   
   @ignore
   */
  get _useNativeInput() {
    return this.__useNativeInput;
  }
  set _useNativeInput(value) {
    this.__useNativeInput = value;
  
    // we ignore _useNativeInput when the type is datetime because it is not supported by mobile libraries
    if (this.__useNativeInput && this.type !== type.DATETIME) {
      // Switch to native date/time picker:
      this._elements.toggle.hidden = true;
      this._elements.input.setAttribute('type', this.type);
    
      // Hide pop-over and remove related attributes:
      this._elements.popover.hidden = true;
      this.removeAttribute('aria-haspopup');
      this.removeAttribute('aria-expanded');
      this.removeAttribute('aria-owns');
    }
    else {
      // Switch to CoralUI Calendar picker:
      this._elements.toggle.hidden = false;
      this._elements.input.setAttribute('type', 'text');
    
      // Show pop-over and add related attributes:
      this._elements.popover.hidden = false;
      this.setAttribute('aria-haspopup', 'true');
      this.setAttribute('aria-expanded', 'false');
      this.setAttribute('aria-owns', this._elements.popover.id);
    }
  }
  
  /**
   Sets the correct labellable target.
   
   @protected
   */
  _getLabellableElement() {
    return this._elements.input;
  }
  
  /** @ignore */
  _onPopoverBeforeOpen() {
    this._elements.calendar._validateCalendar();
    this._renderCalendar();
  }
  
  /**
   Matches the accessibility to the state of the popover.
   
   @ignore
   */
  _onPopoverOpenOrClose() {
    this.setAttribute('aria-expanded', this._elements.popover.open);
    
    // set focus to calendar grid
    if (this._elements.popover.open) {
      if (this.type === type.TIME) {
        this._elements.clock.focus();
      }
      else {
        this._elements.calendar.focus();
      }
    }
  }
  
  /** @ignore */
  _onCalendarDayClick(event) {
    if (event.target.tagName === 'A') {
      // since a selection has been made, we close the popover. we cannot use the _onChange listener to handle this
      // because clicking on the same button will not trigger a change event
      this._elements.popover.open = false;
    }
  }
  
  /** @ignore */
  _onInputChange(event) {
    // because we are reimplementing the form field mix in, we will have to stop the propagation and trigger the
    // 'change' event from here
    event.stopPropagation();
    
    this.value = new DateTime.Moment(event.target.value, this.displayFormat);
    this._validateValue();
    
    this.trigger('change');
  }
  
  /** @ignore */
  _onChange(event) {
    event.stopPropagation();
    
    // we create the new value using both calendar and clock controls
    // datepicker should set the current time as default when no time is set, but a date was chosen (if in datetime
    // mode)
    this.value = this._mergeCalendarAndClockDates(true);
    this._validateValue();
    
    this.trigger('change');
  }
  
  /** @ignore */
  _onEscapeKey() {
    this._elements.popover.open = false;
  }
  
  /** @private */
  _onAltDownKey(event) {
    // Stop any consequences of pressing the key
    event.preventDefault();
    
    if (!this._elements.popover.open) {
      this._elements.popover.open = true;
    }
  }
  
  /** @ignore */
  _validateValue() {
    // calendar validates only on user input, we have to manually force the validation
    this._elements.calendar._validateCalendar();
    
    // check if the current value is valid and update the internal state of the component
    if (this.type === type.DATE) {
      this.invalid = this._elements.calendar.invalid;
    }
    else if (this.type === type.TIME) {
      this.invalid = this._elements.clock.invalid;
    }
    else {
      this.invalid = this._elements.calendar.invalid || this._elements.clock.invalid;
    }
  }
  
  /** @ignore */
  _mergeCalendarAndClockDates(autoSetTimeIfNeeded) {
    let value = new DateTime.Moment(this._elements.calendar.valueAsDate);
    let time = this._elements.clock.valueAsDate;
    
    if (autoSetTimeIfNeeded && value && !time && this.type === type.DATETIME) {
      // datepicker should set the current time as default when no time is set, but a date was chosen (if in datetime
      // mode)
      time = new DateTime.Moment().toDate();
    }
    
    if (time) {
      if (!value.isValid()) {
        value = new DateTime.Moment();
      }
      
      value.hours(time.getHours());
      value.minutes(time.getMinutes());
    }
    
    return value;
  }
  
  /**
   Helper class that converts the internal moment value into a String using the provided date format. If the value is
   invalid, empty string will be returned.
   
   @param {?Moment} value
   The value representing the date. It has to be a moment object or <code>null</code>
   @param {String} format
   The Date format to be used.
   
   @ignore
   */
  _getValueAsString(value, format) {
    return value && value.isValid() ? value.format(format) : '';
  }
  
  /** @ignore */
  _renderCalendar() {
    if (this._elements.popover.content.innerHTML === '') {
      this._elements.popover.content.appendChild(this._calendarFragment);
      this._calendarFragment = undefined;
    }
  }
  
  // Expose enums
  static get variant() {return variant;}
  static get type() {return type;}
  
  static get observedAttributes() {
    return super.observedAttributes.concat([
      'min',
      'max',
      'type',
      'placeholder',
      'startday',
      'startDay',
      'headerFormat',
      'headerFormat',
      'displayformat',
      'displayFormat',
      'valueformat',
      'valueFormat',
      'variant'
    ]);
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    this.classList.add(CLASSNAME);
    
    // a11y we only have AUTO mode.
    this._useNativeInput = IS_MOBILE_DEVICE;
    this.setAttribute('role', 'datepicker');
    
    // Default reflected attributes
    if (!this._variant) {this.variant = variant.DEFAULT;}
    // "type" takes care of reflecting "displayFormat" and "valueFormat"
    if (!this._type) {this.type = type.DATE;}
    
    // clean up to be able to clone it
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  
    const frag = document.createDocumentFragment();
    
    // Render template
    frag.appendChild(this._elements.popover);
    frag.appendChild(this._elements.hiddenInput);
    frag.appendChild(this._elements.input);
    frag.appendChild(this._elements.toggleButtonContainer);
    
    this.appendChild(frag);
  
    // Point at the button from the bottom
    this._elements.popover.target = this._elements.toggle;
  }
}

export default Datetime;