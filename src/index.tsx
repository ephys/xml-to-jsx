import { cloneElement, ElementType, isValidElement, PureComponent, ReactElement, ReactNode } from 'react';
import type { ObjectMap } from '../../utils/types';
import { hasOwnProperty } from '../../utils/utils';

type ValidTagReplacement = ElementType | ReactElement;

export type TTagMap = Readonly<{ [key: string]: ValidTagReplacement }>;

type Options = Readonly<{
  /**
   * A mapping of XML tag names to React Components or Elements
   *  where the key is the tag name and the value is the component to use.
   *  If the value is a React Component (function, class or string), that component will be used instead and the component will
   *  receive the xml attributes as props.
   *  If the value is a React Element (component instance), it will be copied and the XML attributes will be added on the new element (overwriting existing ones with the same names).
   */
  tags?: TTagMap,

  /**
   * If provided, any tag in the tree not listed in this array will be removed
   */
  allowTags?: string[],

  /**
   * If provided, any tag in the tree listed in this array will be removed
   */
  disallowTags?: string[],

  asHtml?: boolean,
}>;

type Props = Options & Readonly<{
  /**
   * The XML string to parse and render as react elements.
   */
  xml: string,
}>;

/**
 * React component that parses an XML string and renders it as a tree of react elements.
 * The XML string is not allowed to contain the XML tag "parsererror" as it is reserved by DOMParser - https://w3c.github.io/DOM-Parsing/#the-domparser-interface
 *
 * For props, {@see Props}.
 */
export class XmlToJsx extends PureComponent<Props> {
  render() {
    const { xml, ...options } = this.props;

    return xmlToJsx(xml, options);
  }
}

/**
 * Converts an XML string into an array of React Elements and strings.
 * The XML string is not allowed to contain the XML tag "parsererror" as it is reserved by DOMParser - https://w3c.github.io/DOM-Parsing/#the-domparser-interface
 *
 * @param {!string} xml The XML string to convert to React Elements
 * @param {Options} options Option bag - {@see Options}
 * @returns {!Array<React.Element<any> | string | null>} The list of React Elements
 *
 * @__PURE__
 */
export function xmlToJsx(xml: string, options: Options = {}): ReactNode {

  if (options.allowTags && options.disallowTags) {
    throw new Error('Cannot provide both allowTags and disallowTags');
  }

  const xmlAsDomTree: Node[] = xmlToDom(xml, options.asHtml || false);
  const xmlAsJsxTree = domToJsx(xmlAsDomTree, options);

  return xmlAsJsxTree;
}

function xmlToDom(xml: string, asHtml: boolean): Node[] {
  const isValidXml = xml.startsWith('<?xml');

  if (isValidXml && asHtml) {
    throw new Error('Expected to parse HTML but received XML');
  }

  // we wrap xml in jsx-root so that strings that contain more than 1 top level element are still valid XML
  // jsx-root is never actually returned, only its children.
  const xmlMessage = (asHtml || isValidXml) ? xml : `<?xml version="1.0" ?><jsx-root>${xml}</jsx-root>`;

  // TODO: handle attributes containing HTML Entities
  const parser = new DOMParser();

  // we force XML (not html) so it's easier to parse (polyfills) and closer to JSX.
  const mimeType = asHtml ? 'text/html' : 'text/xml';
  const doc = parser.parseFromString(xmlMessage, mimeType);
  const errors = doc.querySelectorAll('parsererror');
  if (errors.length > 0) {
    const errorText = Array.from(errors).map(error => error.textContent).join('\n');
    throw new Error(`[xmlToDom] Failed to parse ${asHtml ? 'html' : 'xml'} string due to the following errors: ${errorText}\nin string ${xmlMessage}`);
  }

  if (asHtml) {
    const body = asHtml ? doc.body : doc;
    if (body == null) {
      return [];
    }

    return Array.from(body.childNodes);
  }

  if (isValidXml) {
    // if we received a valid XML string, we return their root (it will always be 1 item)
    return Array.from(doc.children);
  }

  // if we just got an XML string without header, we return the contents of `jsx-root`.
  // `jsx-root` only exists to allow having more than 1 element at the top level of the XML
  const root = doc.children[0];

  return Array.from(root.childNodes);
}

/**
 * Maps a parsed DOM Node to its react equivalent.
 * If the node has a matching user-defined replacement (via tags attribute), that replacement will be returned.
 * Otherwise, the react-dom equivalent will be returned.
 *
 * @returns The JSX replacement of the DOM Node.
 *
 * @__PURE__
 */
function xmlNodeToJsx(nodeName: string, replacements?: TTagMap | null): ValidTagReplacement {
  if (replacements != null && hasOwnProperty(replacements, nodeName)) {
    return replacements[nodeName];
  }

  // @ts-expect-error
  return nodeName;
}

/**
 * Converts a NamedNodeMap to Object containing the same key => value pairs.
 *
 * @param attributeList The NamedNodeMap to convert.
 * @returns An object containing the same key => value pairs as the attributeList parameter.
 *
 * @__PURE__
 */
function xmlAttributesToJsx(attributeList: NamedNodeMap): ObjectMap<string> {
  const jsxAttributes = {};

  for (let i = 0; i < attributeList.length; i++) {
    const attribute = attributeList[i];

    // style is special and cannot be used, for now
    if (attribute.name === 'style') {
      continue;
    }

    jsxAttributes[attribute.name] = attribute.value;
  }

  return jsxAttributes;
}

const CANNOT_CONTAIN_WHITESPACE_TAGS = ['table', 'tbody', 'thead', 'tr', 'th'];

/**
 * Converts an array of DOM Nodes into an array of React Elements (including strings, and sub-arrays).
 *
 * @param {!Array<!Node>} nodes The nodes to convert into to react elements.
 * @param {!Options } options Options Bag {@see Options}
 * @returns A react-compatible version of the nodes parameter.
 *
 * @__PURE__
 */
function domToJsx(nodes: Node[], options: Options): Array<ReactElement | string | null> {

  return nodes.map((node: Node, i) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      return null;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement) {
        const parentNode = node.parentElement.nodeName.toLowerCase();

        if (CANNOT_CONTAIN_WHITESPACE_TAGS.includes(parentNode)) {
          return node.textContent.trim() || null;
        }
      }

      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      console.error('Only Text and Element nodes are supported.', node);

      return null;
    }

    // in html, tagNames are case-insensitive so we force lowercase. In XML they are case sensitive.
    const nodeName = options.asHtml ? node.nodeName.toLowerCase() : node.nodeName;

    // check tag is in whitelist
    if (options.allowTags && !options.allowTags.includes(nodeName)) {
      return null;
    }

    // check tag is in blacklist
    if (options.disallowTags && options.disallowTags.includes(nodeName)) {
      return null;
    }

    const nodeReplacement = xmlNodeToJsx(nodeName, options.tags);
    const attributes = node instanceof Element ? xmlAttributesToJsx(node.attributes) : {};

    // if anyone has a better idea for a key here, feedback would be highly appreciated!
    // Although it should not matter as the order is never going to change.
    attributes.key = String(i);

    let children = domToJsx(Array.from(node.childNodes), options);

    // some tags, such as <br />, cannot have any children. Even if it's an empty array.
    if (children.length === 0) {
      children = null;
    }

    // replacement is a Component, make a new instance of it.
    if (typeof nodeReplacement === 'function' || typeof nodeReplacement === 'string') {
      // JSX elements must start with an uppercase letter if they are a variable.
      const Tag = nodeReplacement;

      return <Tag {...attributes}>{children}</Tag>;
    }

    // replacement is an instantiated react node. Merge props (formatted text takes precedence).
    if (isValidElement(nodeReplacement)) {
      return cloneElement(nodeReplacement, attributes, children);
    }

    // is invalid
    console.error('Invalid replacement: Must be a tag name, a Component, or a React Element', nodeReplacement);

    return null;
  });
}
