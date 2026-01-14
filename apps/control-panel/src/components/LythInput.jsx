function LythInput({ as = 'input', className = '', ...props }) {
  const Component = as;
  const classes = ['lyth-input', className].filter(Boolean).join(' ');

  return <Component className={classes} {...props} />;
}

export default LythInput;
