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
import base from '../templates/base';
import {transform, commons} from 'coralui-util';
import 'coralui-component-icon';
import getTarget from './getTarget';

const CLASSNAME = 'coral3-Tab';


/**
 @class Coral.Tab
 @classdesc A Tab component
 @htmltag coral-tab
 @extends HTMLElement
 @extends Coral.mixin.component
 */
class Tab extends Component(HTMLElement) {
  constructor() {
    super();
    
    // Templates
    this._elements = {
      label: this.querySelector('coral-tab-label') || document.createElement('coral-tab-label')
    };
    base.call(this._elements);
  }
  
  /**
   The label of the tab.
   
   @type {HTMLElement}
   @contentzone
   @memberof Coral.Tab#
   */
  get label() {
    return this._getContentZone(this._elements.label);
  }
  set label(value) {
    this._setContentZone('label', value, {
      handle: 'label',
      tagName: 'coral-tab-label',
      insert: function(label) {
        this.appendChild(label);
      }
    });
  }
  
  /**
   Specifies the name of the icon used inside the Tab. See {@link Coral.Icon} for valid icon names.
   
   @type {String}
   @default ""
   @htmlattribute icon
   @memberof Coral.Tab#
   
   @see {@link Coral.Icon}
   */
  get icon() {
    const iconElement = this._elements.icon;
    return iconElement ? iconElement.icon : '';
  }
  set icon(value) {
    const iconElement = this._elements.icon;
    iconElement.icon = value;
  
    // removes the icon element from the DOM.
    if (this.icon === '') {
      iconElement.remove();
    }
    // adds the icon back since it was blown away by textContent
    else if (!iconElement.parentNode) {
      this.insertBefore(iconElement, this.firstChild);
    }
  }
  
  /**
   Whether the current Tab is invalid.
   
   @type {Boolean}
   @default false
   @htmlattribute invalid
   @htmlattributereflected
   @memberof Coral.Tab#
   */
  get invalid() {
    return this._invalid || false;
  }
  set invalid(value) {
    this._invalid = transform.booleanAttr(value);
    transform.reflect(this, 'invalid', this._invalid);
    
    this.classList.toggle('is-invalid', this._invalid);
    this.setAttribute('aria-invalid', this._invalid);
  }
  
  /**
   Whether this Tab is disabled. When set to true, this will prevent every user interacting with the Tab. If
   disabled is set to true for a selected Tab it will be deselected.
   
   @type {Boolean}
   @default false
   @htmlattribute disabled
   @htmlattributereflected
   @memberof Coral.Tab#
   */
  get disabled() {
    return this._disabled || false;
  }
  set disabled(value) {
    this._disabled = transform.booleanAttr(value);
    transform.reflect(this, 'disabled', this._disabled);
  
    this.classList.toggle('is-disabled', this.disabled);
    this.setAttribute('aria-disabled', this.disabled);
    
    if (this._disabled && this.selected) {
      this.selected = false;
    }
    
    if (!this._disabled && !this.selected) {
      // We inform the parent to verify if this item should be selected because it's the only one left
      this.trigger('coral-tab:_validateselection');
    }
  }
  
  /**
   Whether the tab is selected.
   @type {Boolean}
   @default false
   @htmlattribute selected
   @htmlattributereflected
   @memberof Coral.Tab#
   */
  get selected() {
    return this._selected || false;
  }
  set selected(value) {
    value = transform.booleanAttr(value);
    
    if (!value || value && !this.disabled) {
      this._selected = value;
      transform.reflect(this, 'selected', this.disabled ? false : this._selected);
  
      this.classList.toggle('is-selected', this._selected);
      this.setAttribute('tabindex', this._selected ? '0' : '-1');
      this.setAttribute('aria-selected', this._selected);
  
      // in case the tab is selected, we need to communicate it to the panels.
      if (this._selected) {
        this._selectTarget();
      }
      this.trigger('coral-tab:_selectedchanged');
    }
  }
  
  /**
   The target element that will be selected when this Tab is selected. It accepts a CSS selector or a DOM element.
   If a CSS Selector is provided, the first matching element will be used.
   
   @type {?HTMLElement|String}
   @default null
   @htmlattribute target
   @memberof Coral.Tab#
   */
  get target() {
    return typeof this._target === 'string' ? this._target : (this._target || null);
  }
  set target(value) {
    if (value === null || typeof value === 'string' || value instanceof Node) {
      this._target = value;
  
      const realTarget = getTarget(this.target);
  
      // we add proper accessibility if available
      if (realTarget) {
        // creates a 2 way binding for accessibility
        this.setAttribute('aria-controls', realTarget.id);
        realTarget.setAttribute('aria-labelledby', this.id);
      }
    }
  }
  
  /**
   Selects the target item
   
   @ignore
   */
  _selectTarget() {
    let realTarget = getTarget(this.target);
    // if the target was define at the tab level, it has precedence over everything
    if (realTarget) {
      realTarget.setAttribute('selected', '');
    }
    // otherwise, we use the target defined at the tablist level
    else {
      const tabList = this.parentNode;
    
      if (tabList && tabList.target) {
        realTarget = getTarget(tabList.target);
      
        if (realTarget) {
          // we get the position of this tab inside the tablist
          const currentIndex = tabList.items.getAll().indexOf(this);
        
          // we select the item with the same index
          const targetItem = (realTarget.items ? realTarget.items.getAll() : realTarget.children)[currentIndex];
        
          // we select the item if it exists
          if (targetItem) {
            targetItem.setAttribute('selected', '');
          }
        }
      }
    }
  }
  
  // For backwards compatibility + Torq
  get defaultContentZone() {return this.label;}
  set defaultContentZone(value) {this.label = value;}
  get _contentZones() {return {'coral-tab-label': 'label'};}
  
  static get observedAttributes() {
    return ['selected', 'disabled', 'icon', 'invalid', 'target'];
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    this.classList.add(CLASSNAME);
  
    // adds the role to support accessibility
    this.setAttribute('role', 'tab');
  
    // Generate a unique ID for the tab panel if one isn't already present
    // This will be used for accessibility purposes
    this.id = this.id || commons.getUID();
  
    // Create a temporary fragment
    const frag = document.createDocumentFragment();
    
    // Render the main template
    if (this.icon) {
      frag.appendChild(this._elements.icon);
    }
  
    const label = this._elements.label;
  
    // Remove it so we can process children
    if (label.parentNode) {
      label.parentNode.removeChild(label);
    }
    
    while (this.firstChild) {
      const child = this.firstChild;
      if (child.nodeType === Node.TEXT_NODE || child.getAttribute('handle') !== 'icon') {
        // Add non-template elements to the label
        label.appendChild(child);
      }
      else {
        this.removeChild(child);
      }
    }
  
    // Add the frag to the component
    this.appendChild(frag);
  
    // Assign the content zones, moving them into place in the process
    this.label = label;
  
    // Query the tab target once the tab item is inserted in the DOM
    if (this.selected) {
      this._selectTarget();
    }
  }
}

export default Tab;