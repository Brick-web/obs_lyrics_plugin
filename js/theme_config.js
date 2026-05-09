export const themeConfig = {
    global: {
        textColor: '#ffffff',
        textShadowColor: 'black',
        fontSize: '64px'
    },
    ktv: {
        scanColor: '#ff0055',
        baseColor: '#ffffff'
    },
    svgCurve: {
        textColor: '#ffffff',
        glowColor: 'rgba(255, 215, 0, 0.3)',
        // 渐变定义：用于生成 SVG <linearGradient>
        gradient: {
            id: 'gold-gradient',
            stops: [
                { offset: '0%', color: 'rgba(184, 134, 11, 0)' },
                {
                    offset: '20%',
                    color: 'rgba(255, 215, 0, 1)',
                    animate: {
                        values: 'rgba(255, 215, 0, 1);rgba(255, 250, 205, 1);rgba(255, 215, 0, 1)',
                        dur: '3s'
                    }
                },
                {
                    offset: '50%',
                    color: 'rgba(218, 165, 32, 1)',
                    animate: {
                        values: 'rgba(218, 165, 32, 1);rgba(255, 223, 0, 1);rgba(218, 165, 32, 1)',
                        dur: '3s',
                        begin: '1s'
                    }
                },
                {
                    offset: '80%',
                    color: 'rgba(255, 215, 0, 1)',
                    animate: {
                        values: 'rgba(255, 215, 0, 1);rgba(255, 250, 205, 1);rgba(255, 215, 0, 1)',
                        dur: '3s'
                    }
                },
                { offset: '100%', color: 'rgba(184, 134, 11, 0)' }
            ]
        }
    },
    comic: {
        textColor: '#FFD700',
        shadowColor: '#000000'
    },
    starry: {
        textColor: '#E0F7FA',
        starColor: '#FFF176'
    },
    particles: {
        primaryColor: '#FFE082',
        glowColor: '#FFAB40'
    },
    neon: {
        neonColor: '#ff00de'
    }

};