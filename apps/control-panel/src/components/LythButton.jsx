const VARIANT_CLASS = {
  primary: 'lyth-button--primary',
  secondary: 'lyth-button--secondary',
  ghost: 'lyth-button--ghost',
  danger: 'lyth-button--danger'
};

function LythButton({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;
  const classes = ['lyth-button', variantClass, className]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} type={type} {...props} />;
}

export default LythButton;
