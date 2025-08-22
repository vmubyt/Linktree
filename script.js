// Star Animation - 4 Zone Continuous Orbital System with Flicker & Smart Trail Pool
let canvas, context;
let width, height;
let stars = [];
let animationId = null;
let lastTime = 0;
let prevTime = 0;
let fps = 60;
let frameCount = 0;
let lastFpsTime = 0;

// Trail pool system
let trailPool = [];
let trailPoolSize = 0;

// Stars configuration - centralized star management
const STARS_CONFIG = {
    // Star count and performance
    count: {
        min: 4000,  // Minimum stars
        max: 7500   // Maximum stars
    },
    
    // Star size configuration (in pixels, FIXED size like links-master)
    size: {
        min: 0.4,  // Minimum star radius (fixed, not scaled by devicePixelRatio) - 2x smaller
        max: 1.0   // Maximum star radius (fixed, not scaled by devicePixelRatio) - 2x smaller
    },
    
    // Star opacity and flicker
    opacity: {
        base: {
            min: 0.55,  // Minimum base alpha
            max: 0.9    // Maximum base alpha
        },
        flicker: {
            frequency: {
                min: 0.03,  // Minimum flicker frequency (Hz)
                max: 0.08   // Maximum flicker frequency (Hz)
            },
            amplitude: {
                min: 0.08,  // Minimum flicker amplitude
                max: 0.15   // Maximum flicker amplitude
            }
        }
    },
    
    // Star color (bluish-white for glow effect)
    color: {
        r: 173,  // Red component
        g: 216,  // Green component  
        b: 255   // Blue component
    }
};

// Orbital system configuration - continuous 4 zones
const ORBITAL_CONFIG = {
    // Zone periods in seconds (continuous mapping) - 3x slower
    zone1Period: 60,  // Fastest (z=1) - was 20s, now 60s
    zone4Period: 240, // Slowest (z=4) - was 80s, now 240s
    
    // Background color (transparent to show CSS gradient)
    backgroundColor: 'rgba(0, 0, 0, 0)',
    
    // Ambient light configuration
    ambientLight: {
        enabled: true,
        centerIntensity: 1.2,      // Very bright for maximum visibility
        warmColor: [34, 51, 68],   // Links-master bgColor: #223344
        coreColor: [255, 255, 255], // Pure white core
        maxRadius: 1.0             // Full canvas coverage
    },
    
    // Orbital center (right edge) - clearly defined
    centerX: 1.0,   // 100% from left edge (exactly at right edge)
    centerY: 0.5,   // 50% from top edge (center vertically)
    

};

    // Trail pool configuration
    const TRAIL_CONFIG = {
        poolPercentage: 0.07,   // 7% of stars can have trails (reduced from 10%)
        maxTrailPoints: 100,     // Longer trails for better visibility
        fadeOutFactor: 0.94,    // Slower fade out (0.94 = 6% fade per point)
        canvasMargin: 100       // Larger margin for better detection
    };

function initStarTrails() {
    canvas = document.querySelector('#bg-stars');
    if (!canvas) {
        console.error('Canvas #bg-stars not found');
        return;
    }
    
    context = canvas.getContext('2d');
    setSize();
    generateStars();
    initTrailPool();
    startAnimation();
    
    // Log orbital system information
    const centerX = ORBITAL_CONFIG.centerX * width;
    const centerY = ORBITAL_CONFIG.centerY * height;
    console.log('🌌 Orbital System Initialized:');
    console.log(`📍 Center: (${centerX.toFixed(0)}, ${centerY.toFixed(0)}) - Right edge center`);
    console.log(`🔄 Rotation: Counter-clockwise (positive omega)`);
    console.log(`⭐ Stars: ${stars.length} stars in 4 continuous zones`);
    console.log(`   📊 Count: ${STARS_CONFIG.count.min}-${STARS_CONFIG.count.max} stars (adjusted for device)`);
    console.log(`   📱 Device: ${width <= 768 ? 'Mobile' : 'Desktop'} (${width}x${height})`);
    console.log(`   📏 Size: ${STARS_CONFIG.size.min}-${STARS_CONFIG.size.max}px radius (FIXED, no devicePixelRatio scaling)`);
    console.log(`   🎨 Color: RGB(${STARS_CONFIG.color.r}, ${STARS_CONFIG.color.g}, ${STARS_CONFIG.color.b})`);
    console.log(`   ✨ Opacity: ${STARS_CONFIG.opacity.base.min}-${STARS_CONFIG.opacity.base.max} base, ${STARS_CONFIG.opacity.flicker.frequency.min}-${STARS_CONFIG.opacity.flicker.frequency.max}Hz flicker`);
    console.log(`🎯 Zone 1 (inner): ~60s period, Zone 4 (outer): ~240s period (3x slower)`);
    const eligibleStars = stars.filter(s => s.canHaveTrail).length;
    console.log(`🌊 Trail Pool: ${trailPoolSize} available trails (${eligibleStars} eligible stars, ${(TRAIL_CONFIG.poolPercentage * 100).toFixed(0)}% of total)`);
    console.log(`🚀 Comets: 0.2x faster, smallest comets: +0.2x faster (reduced to 7%)`);
    console.log(`⭐ Large stars in Zone 2-4: 0.5x slower (zone-based distribution)`);
    console.log(`✨ Natural Twinkling: 5% of small stars (0.08-0.12 Hz, 18-22% intensity)`);
    console.log(`📱 Desktop extras: Zone 1 (+80%), Zone 2 (+15%)`);
    console.log(`🌅 Ambient light: ${width <= 768 ? '1/3 canvas coverage (120% radius, same as desktop)' : '4/5 canvas coverage (120% radius to avoid center hole)'}`);
    console.log(`✨ Enhanced gradient: ${width <= 768 ? 'Mobile (7 stops)' : 'Desktop (12 stops)'} for ultra-smooth transitions`);

    
    // Handle resize
    window.addEventListener('resize', handleResize);
    
    // Handle visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

function setSize() {
    const dpr = window.devicePixelRatio || 1;
    
    // Use innerWidth/innerHeight for full screen
    width = window.innerWidth;
    height = window.innerHeight;
    
    // Set canvas buffer size with devicePixelRatio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Set display size
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Reset transform and scale context to match devicePixelRatio
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);
}

function calculateOptimalStarCount() {
    const area = width * height;
    const baseCount = Math.floor(area / 600); // Base divisor for stars
    
    // Adjust count based on device type
    let adjustedCount = baseCount;
    const isMobile = width <= 768; // Mobile breakpoint
    
    if (isMobile) {
        // Reduce stars by 0.5x for smartphone
        adjustedCount = Math.floor(baseCount * 0.5);
    } else {
        // Increase stars by 0.5x for desktop
        adjustedCount = Math.floor(baseCount * 1.5);
    }
    
    return Math.max(STARS_CONFIG.count.min, 
                   Math.min(adjustedCount, STARS_CONFIG.count.max));
}

function generateStars() {
    stars = [];
    const maxRadius = Math.sqrt(width * width + height * height);
    const centerX = ORBITAL_CONFIG.centerX * width;
    const centerY = ORBITAL_CONFIG.centerY * height;
    
    const starCount = calculateOptimalStarCount();
    
    // Pre-calculate which stars can have trails (only 5% of total)
    const trailEligibleCount = Math.floor(starCount * TRAIL_CONFIG.poolPercentage);
    const trailEligibleIndices = new Set();
    
    // Randomly select which stars can have trails
    while (trailEligibleIndices.size < trailEligibleCount) {
        const randomIndex = Math.floor(Math.random() * starCount);
        trailEligibleIndices.add(randomIndex);
    }
    
    for (let i = 0; i < starCount; i++) {
        // Area-uniform sampling: r = sqrt(rand) * Rmax
        const radiusRatio = Math.sqrt(Math.random());
        const radius = radiusRatio * maxRadius;
        
        // Random initial angle
        const theta = Math.random() * Math.PI * 2;
        
        // Continuous zone mapping: z = 1 + 3*rNorm
        const rNorm = radiusRatio; // radiusRatio is already normalized [0,1]
        const zone = 1 + 3 * rNorm;
        
        // Calculate period: T = 60 * z (3x slower than before)
        const basePeriod = 60 * zone;
        
        // Add jitter ±5%
        const jitter = 0.95 + Math.random() * 0.1; // ±5% variation
        const period = basePeriod * jitter;
        
        // Calculate angular velocity: omega = (2*Math.PI) / T
        // Positive omega = counter-clockwise rotation (standard orbital direction)
        let omega = (2 * Math.PI) / period;
        
        // Determine star size based on zone distribution
        let size;
        const sizeRange = STARS_CONFIG.size.max - STARS_CONFIG.size.min;
        const smallMediumThreshold = STARS_CONFIG.size.min + sizeRange * 0.6; // 60% of range for small-medium
        const largeThreshold = STARS_CONFIG.size.min + sizeRange * 0.8; // 80% of range for large
        const smallThreshold = STARS_CONFIG.size.min + sizeRange * 0.4; // 40% of range for small stars
        
        // Zone-based size distribution
        if (zone < 2) {
            // Zone 1: Only small and medium stars
            size = STARS_CONFIG.size.min + Math.random() * (smallMediumThreshold - STARS_CONFIG.size.min);
        } else if (zone >= 2 && zone < 4) {
            // Zone 2-3: Mix of all sizes with zone-based distribution
            const zoneFactor = (zone - 2) / 1; // 0 for zone 2, 1 for zone 3
            
            // Large stars: increase with zone (24% -> 40%) - reduced by 0.2x from 30%->50%
            const largeStarChance = (0.3 + zoneFactor * 0.2) * 0.8; // 24% -> 40%
            
            // Small-medium stars: decrease with zone (76% -> 60%) - adjusted accordingly
            const smallMediumChance = (0.7 - zoneFactor * 0.2) * 0.8; // 56% -> 48%
            
            if (Math.random() < largeStarChance) {
                // Large star
                size = largeThreshold + Math.random() * (STARS_CONFIG.size.max - largeThreshold);
            } else if (Math.random() < smallMediumChance) {
                // Small-medium star
                size = STARS_CONFIG.size.min + Math.random() * (smallMediumThreshold - STARS_CONFIG.size.min);
            } else {
                // Medium-large star
                size = smallMediumThreshold + Math.random() * (largeThreshold - smallMediumThreshold);
            }
        } else {
            // Zone 4: Mostly large stars (80% chance) with rare medium stars (20% chance)
            if (Math.random() < 0.8) {
                // Large star (80% chance)
                size = largeThreshold + Math.random() * (STARS_CONFIG.size.max - largeThreshold);
            } else {
                // Medium star (20% chance) - rare in zone 4
                size = smallMediumThreshold + Math.random() * (largeThreshold - smallMediumThreshold);
            }
        }
        
        // Natural Twinkling effect for small stars (5% chance)
        const isSmallStar = size <= smallThreshold;
        const shouldHaveShining = isSmallStar && Math.random() < 0.05; // 5% chance for small stars
        
        // Determine if this is a comet (stars with trails)
        const isComet = trailEligibleIndices.has(i);
        
        // Adjust speed based on star type and zone
        if (isComet) {
            // Comets are 0.2x faster regardless of zone
            omega *= 1.2;
            
            // Comets with smallest size are 0.2x faster than other comets
            const isSmallestComet = size <= (STARS_CONFIG.size.min + sizeRange * 0.2);
            if (isSmallestComet) {
                omega *= 1.2; // Additional 0.2x faster for smallest comets
            }
        } else {
            // Regular stars: only large stars in zone 2-3 are slower
            const isLargeStar = size > largeThreshold;
            const isZone2To3 = zone >= 2 && zone < 4;
            
            if (isLargeStar && isZone2To3) {
                omega *= 0.5; // 0.5x slower for large stars in zone 2-3
            }
        }
        
        // Add more stars in specific zones for desktop
        const isDesktop = width > 768;
        const isZone1 = zone < 2; // Zone 1 (inner zone)
        const isZone2 = zone >= 2 && zone < 3; // Zone 2
        
        let shouldAddExtraStar = false;
        if (isDesktop) {
            if (isZone1 && Math.random() < 0.8) { // 80% chance for zone 1 (increased from 30%)
                shouldAddExtraStar = true;
            } else if (isZone2 && Math.random() < 0.15) { // 15% chance for zone 2
                shouldAddExtraStar = true;
            }
        }
        
        // Add 0.5x more stars in zone 1 for all devices
        if (isZone1 && Math.random() < 0.5) { // 50% chance for zone 1 (0.5x more stars)
            shouldAddExtraStar = true;
        }
        
        // Flicker properties
        const flickerFreq = STARS_CONFIG.opacity.flicker.frequency.min + 
            Math.random() * (STARS_CONFIG.opacity.flicker.frequency.max - STARS_CONFIG.opacity.flicker.frequency.min);
        const phase = Math.random() * Math.PI * 2;
        const baseAlpha = STARS_CONFIG.opacity.base.min + 
            Math.random() * (STARS_CONFIG.opacity.base.max - STARS_CONFIG.opacity.base.min);
        const flickerAmp = STARS_CONFIG.opacity.flicker.amplitude.min + 
            Math.random() * (STARS_CONFIG.opacity.flicker.amplitude.max - STARS_CONFIG.opacity.flicker.amplitude.min);
        
        // Natural Twinkling properties for small stars
        let hasShining = false;
        let shiningFreq = 0;
        let shiningAmp = 0;
        let shiningPhase = 0;
        
        if (shouldHaveShining) {
            hasShining = true;
            shiningFreq = 0.08 + Math.random() * 0.04; // 0.08-0.12 Hz (slow twinkling)
            shiningAmp = 0.18 + Math.random() * 0.04;  // 0.18-0.22 (moderate intensity)
            shiningPhase = Math.random() * Math.PI * 2;
        }
        
        const star = {
            radius,
            theta,
            omega,
            size,
            centerX,
            centerY,
            zone,
            period,
            flickerFreq,
            phase,
            baseAlpha,
            flickerAmp,
            hasShining,
            shiningFreq,
            shiningAmp,
            shiningPhase,
            canHaveTrail: trailEligibleIndices.has(i) // Only 5% of stars can have trails
        };
        
        stars.push(star);
        
        // Add extra star in specific zones for desktop
        if (shouldAddExtraStar) {
            const extraStar = {
                ...star,
                radius: radius * (0.8 + Math.random() * 0.4), // Slightly different radius
                theta: Math.random() * Math.PI * 2, // Random angle
                size: size * (0.7 + Math.random() * 0.6), // Slightly different size
                hasShining: false, // Extra stars don't get shining effect
                canHaveTrail: false // Extra stars don't get trails
            };
            stars.push(extraStar);
        }
    }
}

function updateStars(dt) {
    stars.forEach(star => {
        star.theta += star.omega * dt;
    });
    
    // Update trail system
    updateStarTrails(dt);
}

function drawAmbientLight() {
    if (!ORBITAL_CONFIG.ambientLight.enabled) return;
    
    const centerX = ORBITAL_CONFIG.centerX * width;
    const centerY = ORBITAL_CONFIG.centerY * height;
    
    // Create radial gradient for natural ambient light effect
    const isMobile = width <= 768;
    
    // Calculate precise gradient radius based on coverage
    let gradientRadius;
    if (isMobile) {
        // Mobile: Use same radius as desktop to avoid center hole
        gradientRadius = width * 1.2; // 120% of canvas width (same as desktop)
    } else {
        // Desktop: 4/5 coverage means gradient covers 4/5 of canvas width
        // But we need larger radius to avoid center hole
        gradientRadius = width * 1.2; // 120% of canvas width to ensure full coverage
    }
    
    // Create radial gradient from orbit center with inner radius to avoid center hole
    const innerRadius = 0; // Start from center
    const gradient = context.createRadialGradient(
        centerX, centerY, innerRadius,          // Inner circle (center)
        centerX, centerY, gradientRadius        // Outer circle (coverage radius)
    );
    
    // Enhanced smooth ambient light with more color stops for better transitions
    const intensity = ORBITAL_CONFIG.ambientLight.centerIntensity;
    const warmColor = ORBITAL_CONFIG.ambientLight.warmColor;
    
    if (isMobile) {
        // Mobile: More gradual fade with extra color stops for smoothness
        gradient.addColorStop(0, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity})`);           // Full intensity at center
        gradient.addColorStop(0.15, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.95})`); // 95% intensity
        gradient.addColorStop(0.3, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.85})`);  // 85% intensity
        gradient.addColorStop(0.45, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.7})`);   // 70% intensity
        gradient.addColorStop(0.6, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.5})`);    // 50% intensity
        gradient.addColorStop(0.75, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.25})`);  // 25% intensity
        gradient.addColorStop(0.9, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.1})`);    // 10% intensity
        gradient.addColorStop(1, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, 0)`);                     // Transparent
    } else {
        // Desktop: Ultra-smooth gradient with many color stops for premium feel
        gradient.addColorStop(0, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity})`);           // Full intensity at center
        gradient.addColorStop(0.1, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.98})`);  // 98% intensity
        gradient.addColorStop(0.2, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.92})`);  // 92% intensity
        gradient.addColorStop(0.3, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.82})`);  // 82% intensity
        gradient.addColorStop(0.4, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.68})`);  // 68% intensity
        gradient.addColorStop(0.5, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.52})`);  // 52% intensity
        gradient.addColorStop(0.6, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.38})`);  // 38% intensity
        gradient.addColorStop(0.7, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.25})`);  // 25% intensity
        gradient.addColorStop(0.8, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.15})`);  // 15% intensity
        gradient.addColorStop(0.9, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.08})`);  // 8% intensity
        gradient.addColorStop(0.95, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, ${intensity * 0.03})`); // 3% intensity
        gradient.addColorStop(1, `rgba(${warmColor[0]}, ${warmColor[1]}, ${warmColor[2]}, 0)`);                     // Transparent
    }
    
    // Draw the ambient light with enhanced blending
    context.save();
    context.globalCompositeOperation = 'screen'; // Screen blending for natural light effect
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();
}



function renderStars(currentTime) {
    // Clear canvas with transparent background to show CSS gradient
    context.clearRect(0, 0, width, height);
    
    // Draw ambient light effect
    drawAmbientLight();
    
    // Set composite operation for glow effect
    context.globalCompositeOperation = 'lighter';
    
    // Draw orbital center indicator (subtle)
    const centerX = ORBITAL_CONFIG.centerX * width;
    const centerY = ORBITAL_CONFIG.centerY * height;
    

    
    // Draw orbital direction indicator (arrow showing counter-clockwise)
    const arrowRadius = 50;
    const arrowAngle = currentTime * 0.5; // Rotating arrow
    const arrowX = centerX + arrowRadius * Math.cos(arrowAngle);
    const arrowY = centerY + arrowRadius * Math.sin(arrowAngle);
    
    context.beginPath();
    context.arc(arrowX, arrowY, 2, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.15)';
    context.fill();
    
    // Render trails first (behind stars)
    renderTrails(currentTime);
    
    // Render stars
    stars.forEach(star => {
        // Calculate current position using polar coordinates
        let x = star.centerX + star.radius * Math.cos(star.theta);
        let y = star.centerY + star.radius * Math.sin(star.theta);
        

        
        // Calculate flicker alpha
        const flickerValue = Math.sin(2 * Math.PI * currentTime * star.flickerFreq + star.phase);
        let alpha = star.baseAlpha * (1 + star.flickerAmp * flickerValue);
        
        // Apply Natural Twinkling effect for small stars
        if (star.hasShining) {
            const shiningValue = Math.sin(2 * Math.PI * currentTime * star.shiningFreq + star.shiningPhase);
            const twinklingEffect = 1 + star.shiningAmp * shiningValue;
            alpha *= twinklingEffect;
            
            // Add subtle size variation for twinkling stars
            const sizeVariation = 1 + 0.1 * shiningValue; // 10% size variation
            const twinklingSize = star.size * sizeVariation;
            
            // Draw twinkling star with enhanced glow
            context.beginPath();
            context.arc(x, y, twinklingSize * 1.3, 0, Math.PI * 2); // Larger glow
            context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
            context.fill();
            
            context.beginPath();
            context.arc(x, y, twinklingSize, 0, Math.PI * 2);
            context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            context.fill();
            
            return; // Skip normal star rendering for twinkling stars
        }
        
        // Draw circular star with FIXED size (no devicePixelRatio scaling)
        context.beginPath();
        context.arc(x, y, star.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        context.fill();
        
        // Add subtle glow effect for larger stars
        if (star.size > 0.8) {
            context.beginPath();
            context.arc(x, y, star.size * 1.2, 0, Math.PI * 2);
            context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
            context.fill();
        }
    });
    
    // Reset composite operation
    context.globalCompositeOperation = 'source-over';
}

function updateFPS(currentTime) {
    frameCount++;
    if (currentTime - lastFpsTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsTime = currentTime;
    }
}

function animate(currentTime) {
    // Calculate delta time with clamp
    const dt = lastTime ? Math.min((currentTime - lastTime) / 1000, 0.033) : 0;
    lastTime = currentTime;
    
    // Update FPS counter
    updateFPS(currentTime);
    
    // Check for reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Render static frame for reduced motion
        context.clearRect(0, 0, width, height);
        context.globalCompositeOperation = 'lighter';
        stars.forEach(star => {
            const x = star.centerX + star.radius * Math.cos(star.theta);
            const y = star.centerY + star.radius * Math.sin(star.theta);
            
            context.beginPath();
            context.arc(x, y, star.size, 0, Math.PI * 2);
            context.fillStyle = `rgba(${STARS_CONFIG.color.r}, ${STARS_CONFIG.color.g}, ${STARS_CONFIG.color.b}, ${star.baseAlpha})`;
            context.fill();
        });
        context.globalCompositeOperation = 'source-over';
        return;
    }
    
    updateStars(dt);
    renderStars(currentTime / 1000); // Convert to seconds for flicker
    
    if (!document.hidden) {
        animationId = requestAnimationFrame(animate);
    }
}

function startAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    lastTime = 0;
    prevTime = 0;
    animationId = requestAnimationFrame(animate);
}

function handleResize() {
    setSize();
    generateStars();
    initTrailPool();
    startAnimation();
}

function handleVisibilityChange() {
    if (document.hidden) {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    } else {
        // Reset prevTime when becoming visible
        prevTime = 0;
        startAnimation();
    }
}

// Trail pool system functions
function initTrailPool() {
    trailPoolSize = Math.floor(stars.length * TRAIL_CONFIG.poolPercentage);
    trailPool = [];
    
    // Initialize trail pool with available trails
    for (let i = 0; i < trailPoolSize; i++) {
        trailPool.push({
            id: i,
            available: true,
            assignedTo: null,
            points: []
        });
    }
    
    console.log(`🌊 Trail pool initialized with ${trailPoolSize} available trails`);
}

function getAvailableTrail() {
    for (let trail of trailPool) {
        if (trail.available) {
            return trail;
        }
    }
    return null;
}

function releaseTrail(trailId) {
    const trail = trailPool.find(t => t.id === trailId);
    if (trail) {
        trail.available = true;
        trail.assignedTo = null;
        trail.points = [];
    }
}

function isStarInCanvas(x, y) {
    const margin = TRAIL_CONFIG.canvasMargin;
    return x >= -margin && x <= width + margin && y >= -margin && y <= height + margin;
}

function updateStarTrails(dt) {
    stars.forEach(star => {
        // Calculate current position
        const x = star.centerX + star.radius * Math.cos(star.theta);
        const y = star.centerY + star.radius * Math.sin(star.theta);
        
        const wasInCanvas = star.inCanvas || false;
        const isInCanvas = isStarInCanvas(x, y);
        
        // Star entering canvas
        if (!wasInCanvas && isInCanvas) {
            // Only assign trail if star is eligible AND doesn't have one AND there's an available trail
            if (star.canHaveTrail && !star.hasTrail) {
                const availableTrail = getAvailableTrail();
                if (availableTrail) {
                    star.hasTrail = true;
                    star.trailId = availableTrail.id;
                    availableTrail.available = false;
                    availableTrail.assignedTo = star;
                    availableTrail.points = [];
                }
            }
        }
        
        // Star exiting canvas
        if (wasInCanvas && !isInCanvas) {
            if (star.hasTrail) {
                releaseTrail(star.trailId);
                star.hasTrail = false;
                star.trailId = null;
            }
        }
        
        // Update trail if star has one
        if (star.hasTrail && isInCanvas) {
            const trail = trailPool.find(t => t.id === star.trailId);
            if (trail) {
                trail.points.push([x, y]);
                
                // Trim trail to max length
                if (trail.points.length > TRAIL_CONFIG.maxTrailPoints) {
                    trail.points.shift();
                }
            }
        }
        
        // Update star's canvas status
        star.inCanvas = isInCanvas;
    });
}

function renderTrails(currentTime) {
    const centerX = ORBITAL_CONFIG.centerX * width;
    const centerY = ORBITAL_CONFIG.centerY * height;
    
    trailPool.forEach(trail => {
        if (!trail.available && trail.points.length > 1) {
            const star = trail.assignedTo;
            if (star) {
                const trailLength = trail.points.length;
                
                // Draw trail points with fade effect
                for (let i = 0; i < trailLength - 1; i++) {
                    let [x1, y1] = trail.points[i];
                    let [x2, y2] = trail.points[i + 1];
                    
                                         
                    
                    // Calculate fade based on position in trail
                    const fadeRatio = i / trailLength;
                    const fadeAlpha = Math.pow(TRAIL_CONFIG.fadeOutFactor, (trailLength - i));
                    
                    // Use same color and size as the star
                    const flickerValue = Math.sin(2 * Math.PI * currentTime * star.flickerFreq + star.phase);
                    const baseAlpha = star.baseAlpha * (1 + star.flickerAmp * flickerValue);
                    const finalAlpha = baseAlpha * fadeAlpha * 0.6; // 60% of star alpha for trail
                    
                    // Draw trail point
                    context.beginPath();
                    context.arc(x1, y1, star.size * 0.8, 0, Math.PI * 2); // Slightly smaller than star
                    context.fillStyle = `rgba(${STARS_CONFIG.color.r}, ${STARS_CONFIG.color.g}, ${STARS_CONFIG.color.b}, ${finalAlpha})`;
                    context.fill();
                }
            }
        }
    });
}

// Control functions for external access
window.starsConfig = STARS_CONFIG;
window.orbitalConfig = ORBITAL_CONFIG;
window.trailConfig = TRAIL_CONFIG;

window.setStarCount = function(minCount, maxCount) {
    STARS_CONFIG.count.min = minCount || 4000;
    STARS_CONFIG.count.max = maxCount || 7500;
    generateStars();
};

window.setStarSize = function(minSize, maxSize) {
    STARS_CONFIG.size.min = minSize || 0.4;
    STARS_CONFIG.size.max = maxSize || 1.0;
    generateStars();
};

window.setStarOpacity = function(baseMin, baseMax, flickerFreqMin, flickerFreqMax, flickerAmpMin, flickerAmpMax) {
    if (baseMin !== undefined) STARS_CONFIG.opacity.base.min = baseMin;
    if (baseMax !== undefined) STARS_CONFIG.opacity.base.max = baseMax;
    if (flickerFreqMin !== undefined) STARS_CONFIG.opacity.flicker.frequency.min = flickerFreqMin;
    if (flickerFreqMax !== undefined) STARS_CONFIG.opacity.flicker.frequency.max = flickerFreqMax;
    if (flickerAmpMin !== undefined) STARS_CONFIG.opacity.flicker.amplitude.min = flickerAmpMin;
    if (flickerAmpMax !== undefined) STARS_CONFIG.opacity.flicker.amplitude.max = flickerAmpMax;
    generateStars();
};

window.setStarColor = function(r, g, b) {
    STARS_CONFIG.color.r = r || 173;
    STARS_CONFIG.color.g = g || 216;
    STARS_CONFIG.color.b = b || 255;
};

window.setAmbientLight = function(enabled, intensity, maxRadius) {
    if (enabled !== undefined) ORBITAL_CONFIG.ambientLight.enabled = enabled;
    if (intensity !== undefined) ORBITAL_CONFIG.ambientLight.centerIntensity = intensity;
    if (maxRadius !== undefined) ORBITAL_CONFIG.ambientLight.maxRadius = maxRadius;
    console.log('🌅 Ambient light updated:', ORBITAL_CONFIG.ambientLight);
};

// Test ambient light function
window.testAmbientLight = function() {
    console.log('🌅 Testing ambient light...');
    console.log('Current config:', ORBITAL_CONFIG.ambientLight);
    console.log('Canvas size:', width, 'x', height);
    console.log('Orbit center:', ORBITAL_CONFIG.centerX * width, ORBITAL_CONFIG.centerY * height);
    
    // Force a single frame render to test
    renderStars(Date.now() / 1000);
};

window.setBackgroundColor = function(color) {
    ORBITAL_CONFIG.backgroundColor = color;
};

window.setOrbitalCenter = function(x, y) {
    ORBITAL_CONFIG.centerX = x;
    ORBITAL_CONFIG.centerY = y;
    generateStars();
    console.log(`📍 Orbital center moved to: (${(x * width).toFixed(0)}, ${(y * height).toFixed(0)})`);
};

window.getOrbitalInfo = function() {
    const centerX = ORBITAL_CONFIG.centerX * width;
    const centerY = ORBITAL_CONFIG.centerY * height;
    
    // Count active trails
    const activeTrails = trailPool.filter(t => !t.available).length;
    
    return {
        center: { x: centerX, y: centerY },
        rotation: 'counter-clockwise',
        stars: stars.length,
        zones: '4 continuous zones',
        trails: {
            total: trailPoolSize,
            active: activeTrails,
            available: trailPoolSize - activeTrails
        }
    };
};

window.getStarsInfo = function() {
    return {
        config: STARS_CONFIG,
        current: {
            count: stars.length,
            eligibleForTrails: stars.filter(s => s.canHaveTrail).length,
            withTrails: stars.filter(s => s.hasTrail).length
        }
    };
};

// Trail control functions
window.setTrailConfig = function(poolPercentage, maxTrailPoints, fadeOutFactor) {
    if (poolPercentage !== undefined) TRAIL_CONFIG.poolPercentage = poolPercentage;
    if (maxTrailPoints !== undefined) TRAIL_CONFIG.maxTrailPoints = maxTrailPoints;
    if (fadeOutFactor !== undefined) TRAIL_CONFIG.fadeOutFactor = fadeOutFactor;
    
    initTrailPool();
    console.log('🌊 Trail config updated:', TRAIL_CONFIG);
};

window.getTrailInfo = function() {
    const activeTrails = trailPool.filter(t => !t.available);
    const eligibleStars = stars.filter(s => s.canHaveTrail).length;
    const starsWithTrails = stars.filter(s => s.hasTrail).length;
    
    return {
        config: TRAIL_CONFIG,
        pool: {
            total: trailPoolSize,
            active: activeTrails.length,
            available: trailPoolSize - activeTrails.length
        },
        stars: {
            total: stars.length,
            eligible: eligibleStars,
            withTrails: starsWithTrails,
            percentage: ((eligibleStars / stars.length) * 100).toFixed(1) + '%'
        },
        activeTrails: activeTrails.map(t => ({
            id: t.id,
            assignedTo: t.assignedTo ? {
                zone: t.assignedTo.zone,
                size: t.assignedTo.size,
                trailPoints: t.points.length
            } : null
        }))
    };
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initStarTrails();
    });
} else {
    initStarTrails();
}
