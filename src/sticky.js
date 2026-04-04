
/**
 * Sticky.js
 * Library for sticky elements written in vanilla javascript. With this library you can easily set sticky elements on your website. It's also responsive.
 *
 * @version 1.3.0
 * @author Rafal Galus <biuro@rafalgalus.pl>
 * @website https://rgalus.github.io/sticky-js/
 * @repo https://github.com/rgalus/sticky-js
 * @license https://github.com/rgalus/sticky-js/blob/master/LICENSE
 */

class Sticky {
  /**
   * Sticky instance constructor
   * @constructor
   * @param {string} selector - Selector which we can find elements
   * @param {string} options - Global options for sticky elements (could be overwritten by data-{option}="" attributes)
   */
  constructor(selector = '', options = {}) {
    this.selector = selector;
    this.elements = [];

    this.version = '1.3.0';

    this.vp = this.getViewportSize();
    this.body = document.querySelector('body');

    this.options = {
      wrap: options.wrap || false,
      wrapWith: options.wrapWith || '<span></span>',
      marginTop: options.marginTop || 0,
      marginBottom: options.marginBottom || 0,
      stickyFor: options.stickyFor || 0,
      stickyClass: options.stickyClass || null,
      stickyContainer: options.stickyContainer || 'body',
      stickyHeight: options.stickyHeight || null,
    };

    this.updateScrollTopPosition = this.updateScrollTopPosition.bind(this);
    this.scrollDirection = 'down';
    this.previousScrollTop = 0;

    this.updateScrollTopPosition();
    window.addEventListener('load', this.updateScrollTopPosition);
    window.addEventListener('scroll', this.updateScrollTopPosition);

    this.run();
  }


  /**
   * Function that waits for page to be fully loaded and then renders & activates every sticky element found with specified selector
   * @function
   */
  run() {
    // wait for page to be fully loaded
    const pageLoaded = setInterval(() => {
      if (document.readyState === 'complete') {
        clearInterval(pageLoaded);

        const elements = document.querySelectorAll(this.selector);
        this.forEach(elements, (element) => this.renderElement(element));
      }
    }, 10);
  }


  /**
   * Function that assign needed variables for sticky element, that are used in future for calculations and other
   * @function
   * @param {node} element - Element to be rendered
   */
  renderElement(element) {
    // create container for variables needed in future
    element.sticky = {};

    // set default variables
    element.sticky.active = false;
    // Keep track of temporary state used when sticky styles animate element size.
    element.sticky.hasSyncedStickySize = false;
    element.sticky.bottomLocked = false;
    element.sticky.syncRenderedSizeTimeout = null;

    element.sticky.marginTop = parseInt(element.getAttribute('data-margin-top')) || this.options.marginTop;
    element.sticky.marginBottom = parseInt(element.getAttribute('data-margin-bottom')) || this.options.marginBottom;
    element.sticky.stickyFor = parseInt(element.getAttribute('data-sticky-for')) || this.options.stickyFor;
    element.sticky.stickyClass = element.getAttribute('data-sticky-class') || this.options.stickyClass;
    element.sticky.stickyHeight = element.getAttribute('data-sticky-height') || this.options.stickyHeight;
    element.sticky.wrap = element.hasAttribute('data-sticky-wrap') ? true : this.options.wrap;
    // @todo attribute for stickyContainer
    // element.sticky.stickyContainer = element.getAttribute('data-sticky-container') || this.options.stickyContainer;
    element.sticky.stickyContainer = this.options.stickyContainer;

    element.sticky.container = this.getStickyContainer(element);
    element.sticky.container.rect = this.getRectangle(element.sticky.container);

    element.sticky.rect = this.getRectangle(element);

    // fix when element is image that has not yet loaded and width, height = 0
    if (element.tagName.toLowerCase() === 'img') {
      element.onload = () => {
        element.sticky.rect = this.getRectangle(element);
        this.updateElementRenderedSize(element);
      };
    }

    if (element.sticky.wrap) {
      this.wrapElement(element);
    }

    // activate rendered element
    this.activate(element);
  }


  /**
   * Wraps element into placeholder element
   * @function
   * @param {node} element - Element to be wrapped
   */
  wrapElement(element) {
    element.insertAdjacentHTML('beforebegin', element.getAttribute('data-sticky-wrapWith') || this.options.wrapWith);
    element.previousSibling.appendChild(element);
  }


  /**
   * Function that activates element when specified conditions are met and then initalise events
   * @function
   * @param {node} element - Element to be activated
   */
  activate(element) {
    const stickyHeight = this.getStickyStateHeight(element);

    if (
      ((element.sticky.rect.top + stickyHeight) < (element.sticky.container.rect.top + element.sticky.container.rect.height))
      && (element.sticky.stickyFor < this.vp.width)
      && !element.sticky.active
    ) {
      element.sticky.active = true;
    }

    if (this.elements.indexOf(element) < 0) {
      this.elements.push(element);
    }

    if (!element.sticky.resizeEvent) {
      this.initResizeEvents(element);
      element.sticky.resizeEvent = true;
    }

    if (!element.sticky.scrollEvent) {
      this.initScrollEvents(element);
      element.sticky.scrollEvent = true;
    }

    this.setPosition(element);
   }


  /**
   * Function which is adding onResizeEvents to window listener and assigns function to element as resizeListener
   * @function
   * @param {node} element - Element for which resize events are initialised
   */
   initResizeEvents(element) {
    element.sticky.resizeListener = () => this.onResizeEvents(element);
    window.addEventListener('resize', element.sticky.resizeListener);
   }


  /**
   * Removes element listener from resize event
   * @function
   * @param {node} element - Element from which listener is deleted
   */
   destroyResizeEvents(element) {
    window.removeEventListener('resize', element.sticky.resizeListener);
   }


  /**
   * Function which is fired when user resize window. It checks if element should be activated or deactivated and then run setPosition function
   * @function
   * @param {node} element - Element for which event function is fired
   */
  onResizeEvents(element) {
    this.vp = this.getViewportSize();

    this.updateElementRenderedSize(element);
    element.sticky.container.rect = this.getRectangle(element.sticky.container);
    const stickyHeight = this.getStickyStateHeight(element);

    if (
      ((element.sticky.rect.top + stickyHeight) < (element.sticky.container.rect.top + element.sticky.container.rect.height))
      && (element.sticky.stickyFor < this.vp.width)
      && !element.sticky.active
    ) {
      element.sticky.active = true;
    } else if (
      ((element.sticky.rect.top + stickyHeight) >= (element.sticky.container.rect.top + element.sticky.container.rect.height))
      || element.sticky.stickyFor >= this.vp.width
      && element.sticky.active
    ) {
      element.sticky.active = false;
    }

    this.setPosition(element);
   }


  /**
   * Function which is adding onScrollEvents to window listener and assigns function to element as scrollListener
   * @function
   * @param {node} element - Element for which scroll events are initialised
   */
   initScrollEvents(element) {
    element.sticky.scrollListener = () => this.onScrollEvents(element);
    window.addEventListener('scroll', element.sticky.scrollListener);
   }


  /**
   * Removes element listener from scroll event
   * @function
   * @param {node} element - Element from which listener is deleted
   */
   destroyScrollEvents(element) {
    window.removeEventListener('scroll', element.sticky.scrollListener);
   }


  /**
   * Function which is fired when user scroll window. If element is active, function is invoking setPosition function
   * @function
   * @param {node} element - Element for which event function is fired
   */
   onScrollEvents(element) {
    if (element.sticky && element.sticky.active) {
      this.setPosition(element);
    }
   }


  /**
   * Main function for the library. Here are some condition calculations and css appending for sticky element when user scroll window
   * @function
   * @param {node} element - Element that will be positioned if it's active
   */
   setPosition(element) {
     if (element.isDisabled) {
       return;
     }
    this.css(element, { position: '', width: '', top: '', left: '' });

    const stickyHeight = this.getStickyStateHeight(element);

    if ((this.vp.height < stickyHeight) || !element.sticky.active) {
      return;
    }

    if (!element.sticky.rect.width) {
      element.sticky.rect = this.getRectangle(element);
    }

    if (element.sticky.wrap) {
      this.css(element.parentNode, {
        display: 'block',
        width: element.sticky.rect.width + 'px',
        height: element.sticky.rect.height + 'px',
      });
    }

    if (
      element.sticky.rect.top === 0
      && element.sticky.container === this.body
    ) {
      this.css(element, {
        position: 'fixed',
        top: element.sticky.rect.top + 'px',
        left: element.sticky.rect.left + 'px',
        width: element.sticky.rect.width + 'px',
      });
      if (element.sticky.stickyClass) {
        element.classList.add(element.sticky.stickyClass);
      }
      element.sticky.bottomLocked = false;
      if (this.syncRenderedSize(element)) {
        return;
      }
    } else if (this.scrollTop > (element.sticky.rect.top - element.sticky.marginTop)) {
      // Once we reached the container bottom while scrolling down, keep the
      // element in the clamped state until the user scrolls back up.
      if (element.sticky.bottomLocked && this.scrollDirection !== 'up') {
        this.updateElementRenderedSize(element);

        this.css(element, {
          position: 'fixed',
          width: element.sticky.rect.width + 'px',
          left: element.sticky.rect.left + 'px',
          top: (element.sticky.container.rect.top + element.sticky.container.offsetHeight)
            - (this.scrollTop + element.sticky.rect.height + element.sticky.marginBottom) + 'px',
        });

        if (element.sticky.stickyClass) {
          element.classList.remove(element.sticky.stickyClass);
        }

        return;
      }

      this.css(element, {
        position: 'fixed',
        width: element.sticky.rect.width + 'px',
        left: element.sticky.rect.left + 'px',
      });

      if (
        (this.scrollTop + stickyHeight + element.sticky.marginTop)
        > (element.sticky.container.rect.top + element.sticky.container.offsetHeight - element.sticky.marginBottom)
      ) {
        element.sticky.bottomLocked = true;
        this.updateElementRenderedSize(element);

        if (element.sticky.stickyClass) {
          element.classList.remove(element.sticky.stickyClass);
        }

        this.css(element, {
          top: (element.sticky.container.rect.top + element.sticky.container.offsetHeight) - (this.scrollTop + element.sticky.rect.height + element.sticky.marginBottom) + 'px' }
        );
        if (this.syncRenderedSize(element)) {
          return;
        }
      } else {
        if (this.scrollDirection === 'up') {
          element.sticky.bottomLocked = false;
        }

        if (element.sticky.stickyClass) {
          element.classList.add(element.sticky.stickyClass);
        }

        this.css(element, { top: element.sticky.marginTop + 'px' });
        if (this.syncRenderedSize(element)) {
          return;
        }
      }
    } else {
      element.sticky.hasSyncedStickySize = false;
      element.sticky.bottomLocked = false;
      this.clearScheduledRenderedSizeSync(element);

      if (element.sticky.stickyClass) {
        element.classList.remove(element.sticky.stickyClass);
      }

      this.css(element, { position: '', width: '', top: '', left: '' });

      if (element.sticky.wrap) {
        this.css(element.parentNode, { display: '', width: '', height: '' });
      }
    }
   }


  /**
   * Function that updates element sticky rectangle (with sticky container), then activate or deactivate element, then update position if it's active
   * @function
   */
   update() {
    this.forEach(this.elements, (element) => {
      this.updateElementRenderedSize(element);
      element.sticky.container.rect = this.getRectangle(element.sticky.container);

      this.activate(element);
      this.setPosition(element);
    });
   }


  /**
   * Destroys sticky element, remove listeners
   * @function
   */
   destroy() {
    window.removeEventListener('load', this.updateScrollTopPosition);
    window.removeEventListener('scroll', this.updateScrollTopPosition);

    this.forEach(this.elements, (element) => {
      this.clearScheduledRenderedSizeSync(element);
      this.destroyResizeEvents(element);
      this.destroyScrollEvents(element);
      delete element.sticky;
    });
   }

   enable() {
     this.forEach(this.elements, (element) => {
       element.isDisabled = false;
       this.setPosition(element);
     });
   }

   disable() {
     this.forEach(this.elements, (element) => {
       element.isDisabled = true;
       this.css(element, { position: "", width: "", top: "", left: "" });
     });
   }


  /**
   * Function that returns container element in which sticky element is stuck (if is not specified, then it's stuck to body)
   * @function
   * @param {node} element - Element which sticky container are looked for
   * @return {node} element - Sticky container
   */
   getStickyContainer(element) {
    let container = element.parentNode;

    while (
      !container.hasAttribute('data-sticky-container')
      && !container.parentNode.querySelector(element.sticky.stickyContainer)
      && container !== this.body
    ) {
      container = container.parentNode;
    }

    return container;
   }


  /**
   * Function that returns element rectangle & position (width, height, top, left)
   * @function
   * @param {node} element - Element which position & rectangle are returned
   * @return {object}
   */
  getRectangle(element) {
    this.css(element, { position: '', width: '', top: '', left: '' });

    const width = Math.max(element.offsetWidth, element.clientWidth, element.scrollWidth);
    const height = Math.max(element.offsetHeight, element.clientHeight, element.scrollHeight);

    let top = 0;
    let left = 0;

    do {
      top += element.offsetTop || 0;
      left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while(element);

    return { top, left, width, height };
  }


  /**
   * Returns the height that should be used for sticky-state constraint checks.
   * When an explicit stickyHeight is provided, use that target height instead of
   * the currently rendered height to avoid sticky/non-sticky ping-pong.
   * @function
   * @param {node} element - Sticky element
   * @return {number}
   */
  getStickyStateHeight(element) {
    const explicitStickyHeight = this.resolveStickyHeight(element);

    if (explicitStickyHeight !== null) {
      return explicitStickyHeight;
    }

    return element.sticky.rect.height;
  }


  /**
   * Resolves the configured stickyHeight option/attribute into rendered pixels.
   * The value is measured against a hidden fixed-position element so viewport
   * units and percentages follow the sticky element's fixed positioning rules.
   * @function
   * @param {node} element - Sticky element
   * @return {number|null}
   */
  resolveStickyHeight(element) {
    const { stickyHeight } = element.sticky;

    if (stickyHeight === null || typeof stickyHeight === 'undefined' || stickyHeight === '') {
      return null;
    }

    if (typeof stickyHeight === 'number') {
      return stickyHeight;
    }

    const numericStickyHeight = Number(stickyHeight);
    if (!Number.isNaN(numericStickyHeight) && Number.isFinite(numericStickyHeight)) {
      return numericStickyHeight;
    }

    if (typeof stickyHeight !== 'string') {
      return null;
    }

    const measurementElement = document.createElement('div');
    measurementElement.setAttribute('aria-hidden', 'true');
    this.css(measurementElement, {
      position: 'fixed',
      visibility: 'hidden',
      pointerEvents: 'none',
      top: '0',
      left: '0',
      width: '0',
      height: stickyHeight,
      padding: '0',
      border: '0',
      margin: '0',
      boxSizing: 'border-box',
      fontSize: window.getComputedStyle(element).fontSize,
    });

    this.body.appendChild(measurementElement);
    const measuredHeight = measurementElement.getBoundingClientRect().height;
    this.body.removeChild(measurementElement);

    return measuredHeight || null;
  }


  /**
   * Updates only the rendered width/height of a sticky element without resetting
   * its stored document position. This keeps the original sticky trigger point
   * while allowing update() to pick up size changes caused by sticky classes.
   * @function
   * @param {node} element - Sticky element
   */
  updateElementRenderedSize(element) {
    const renderedRect = element.getBoundingClientRect();

    if (!element.sticky.rect) {
      element.sticky.rect = this.getRectangle(element);
    }

    element.sticky.rect.width = renderedRect.width;
    element.sticky.rect.height = renderedRect.height;
  }


  /**
   * Sync rendered size back into sticky measurements and rerun positioning once
   * after sticky styles had time to animate their dimensions.
   * @function
   * @param {node} element - Sticky element
   * @param {string} reason - Debug reason
   * @return {boolean}
   */
  syncRenderedSize(element) {
    if (element.sticky.hasSyncedStickySize) {
      return false;
    }

    // If a delayed sync is already queued, let it finish instead of stacking
    // more reflows while the sticky animation is still running.
    if (element.sticky.syncRenderedSizeTimeout) {
      return true;
    }

    const renderedRect = element.getBoundingClientRect();
    const widthChanged = Math.abs(renderedRect.width - element.sticky.rect.width) > 0.5;
    const heightChanged = Math.abs(renderedRect.height - element.sticky.rect.height) > 0.5;

    if (!widthChanged && !heightChanged) {
      return false;
    }

    if (element.sticky.isSyncingRenderedSize) {
      return false;
    }

    this.scheduleRenderedSizeSync(element);
    return true;
  }


  /**
   * Schedule one delayed rendered-size sync to let CSS transitions settle.
   * @function
   * @param {node} element - Sticky element
   */
  scheduleRenderedSizeSync(element) {
    element.sticky.syncRenderedSizeTimeout = window.setTimeout(() => {
      element.sticky.syncRenderedSizeTimeout = null;

      if (!element.sticky || element.isDisabled) {
        return;
      }

      const renderedRect = element.getBoundingClientRect();

      // Sticky styles can animate height after the element becomes fixed, so we
      // re-read the rendered box after a delay and then re-run positioning.
      element.sticky.rect.width = renderedRect.width;
      element.sticky.rect.height = renderedRect.height;
      element.sticky.container.rect = this.getRectangle(element.sticky.container);
      element.sticky.hasSyncedStickySize = true;

      element.sticky.isSyncingRenderedSize = true;
      this.setPosition(element);
      element.sticky.isSyncingRenderedSize = false;
    }, 500);
  }


  /**
   * Clear a pending delayed rendered-size sync.
   * @function
   * @param {node} element - Sticky element
   */
  clearScheduledRenderedSizeSync(element) {
    if (!element.sticky || !element.sticky.syncRenderedSizeTimeout) {
      return;
    }

    window.clearTimeout(element.sticky.syncRenderedSizeTimeout);
    element.sticky.syncRenderedSizeTimeout = null;
  }
  /**
   * Function that returns viewport dimensions
   * @function
   * @return {object}
   */
  getViewportSize() {
    return {
      width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
    };
  }


  /**
   * Function that updates window scroll position
   * @function
   * @return {number}
   */
  updateScrollTopPosition() {
    this.scrollTop = (window.pageYOffset || document.scrollTop)  - (document.clientTop || 0) || 0;
    this.scrollDirection = this.scrollTop >= this.previousScrollTop ? 'down' : 'up';
    this.previousScrollTop = this.scrollTop;
  }


  /**
   * Helper function for loops
   * @helper
   * @param {array}
   * @param {function} callback - Callback function (no need for explanation)
   */
  forEach(array, callback) {
    for (let i = 0, len = array.length; i < len; i++) {
      callback(array[i]);
    }
  }


  /**
   * Helper function to add/remove css properties for specified element.
   * @helper
   * @param {node} element - DOM element
   * @param {object} properties - CSS properties that will be added/removed from specified element
   */
  css(element, properties) {
    for (let property in properties) {
      if (properties.hasOwnProperty(property)) {
        element.style[property] = properties[property];
      }
    }
  }
}


/**
 * Export function that supports AMD, CommonJS and Plain Browser.
 */
((root, factory) => {
  if (typeof exports !== 'undefined') {
    module.exports = factory;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return factory;
    });
  } else {
    root.Sticky = factory;
  }
})(this, Sticky);
