import './GlitchText.css';

const GlitchText = ({ 
  children, 
  speed = 1, 
  intensity = 'normal', 
  enableShadows = true, 
  enableOnHover = true, 
  className = '' 
}) => {
  const intensityConfig = {
    subtle: { shadowOffset: 4, opacity: 0.6, clipFrequency: 1 },
    normal: { shadowOffset: 8, opacity: 0.9, clipFrequency: 1 },
    intense: { shadowOffset: 16, opacity: 1, clipFrequency: 1.5 },
    extreme: { shadowOffset: 24, opacity: 1, clipFrequency: 2 },
  };

  const config = intensityConfig[intensity] || intensityConfig.normal;
  const shadowOffset = config.shadowOffset;
  const shadowOpacity = config.opacity;
  const durationMultiplier = 1 / config.clipFrequency;

  const inlineStyles = {
    '--after-duration': `${speed * 3 * durationMultiplier}s`,
    '--before-duration': `${speed * 2 * durationMultiplier}s`,
    '--after-shadow': enableShadows ? `${-shadowOffset}px 0 rgba(224, 73, 143, ${shadowOpacity})` : 'none',
    '--before-shadow': enableShadows ? `${shadowOffset}px 0 rgba(0, 240, 255, ${shadowOpacity})` : 'none',
    '--clip-offset': `${shadowOffset}px`,
  };

  const hoverClass = enableOnHover ? 'enable-on-hover' : '';
  const intensityClass = `intensity-${intensity}`;

  return (
    <div className={`glitch ${hoverClass} ${intensityClass} ${className}`} style={inlineStyles} data-text={children}>
      {children}
    </div>
  );
};

export default GlitchText;
