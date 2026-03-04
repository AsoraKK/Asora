const VARIANT_CLASS = {
  panel: 'lyth-card--panel',
  tile: 'lyth-card--tile',
  plain: 'lyth-card--plain'
};

function LythCard({
  as = 'div',
  variant = 'panel',
  className = '',
  ...props
}) {
  const Component = as;
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.panel;
  const classes = ['lyth-card', variantClass, className]
    .filter(Boolean)
    .join(' ');

  return <Component className={classes} {...props} />;
}

export default LythCard;
