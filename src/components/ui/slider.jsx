import React from "react"

/**
 * Super simplified slider using <input type="range">, 
 * since we just want a minimal working example.
 * usage: <Slider defaultValue={[20]} min={1} max={250} onValueChange={(val)=>...}/>
 */
export function Slider({
  defaultValue = [20],
  min = 1,
  max = 100,
  step = 1,
  className = "",
  onValueChange,
  ...props
}) {
  const [val, setVal] = React.useState(defaultValue[0])

  function handleChange(e) {
    const newVal = parseInt(e.target.value)
    setVal(newVal)
    onValueChange?.([newVal]) // we pass an array to mimic the original usage
  }

  return (
    <input
      type="range"
      value={val}
      min={min}
      max={max}
      step={step}
      onChange={handleChange}
      className={`w-full cursor-pointer ${className}`}
      {...props}
    />
  )
}