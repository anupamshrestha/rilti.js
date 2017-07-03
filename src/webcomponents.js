(() => {
  const {extend, dom, isFunc, each} = rot;

  rot.Component = (tag, config) => {
    if(!tag.includes('-')) throw new Error('components must have a hyphenated tag');
    const {create, mount, destroy, attr, props, methods, adopted} = config, attrs = [];
    each(attr, (_, key) => attrs.push(key));

    const CustomElement = class extends HTMLElement {
      constructor() {
        super();
        const element = dom(this);
        element.pure.isComponent = true;
        if(props) each(props, (val,key) => element[key] = val);
        if(isFunc(create)) create.call(element, element);
        element.data.emit('create', element);
      }
      connectedCallback() {
        const element = dom(this);
        if(isFunc(mount)) mount.call(element, element);
        element.data.emit('mount', element);
      }
      disconnectedCallback() {
        const element = dom(this);
        if(isFunc(destroy)) destroy.call(element, element);
        element.data.emit('destroy', element);
      }
      adoptedCallback() {
        const element = dom(this);
        if(isFunc(adopted)) adopted.call(element, element);
        element.data.emit('adopted', element);
      }
      static get observedAttributes() {
        return attrs;
      }
      attributeChangedCallback(attrName, oldVal, newVal) {
          const element = dom(this);
          attr[attrName].call(element, oldVal, newVal, element);
      }
    }
    if(methods) extend(CustomElement.prototype, methods);

    window.customElements.define(tag, CustomElement)
  }

})();