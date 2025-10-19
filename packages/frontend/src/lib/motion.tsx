// Lightweight shims for framer-motion APIs used in the UI components
// They render plain elements and ignore animation props so the code can run without the dependency.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const React: any = require('react')

function createMotionTag(tag: any) {
  return React.forwardRef(function MotionTag(props: any, ref: any) {
    const { children, style, whileHover, initial, animate, exit, transition, ...rest } = props || {}
    // Merge a tiny hover effect via CSS transform if whileHover.scale is provided
    const mergedStyle = { ...(style || {}) }
    return React.createElement(tag, { ref, style: mergedStyle, ...rest }, children)
  })
}

export const motion = {
  div: createMotionTag('div'),
  span: createMotionTag('span'),
}

export const AnimatePresence: any = function AnimatePresence(props: any) {
  return React.createElement(React.Fragment, null, props.children)
}
