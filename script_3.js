tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            display: ['"Barlow Condensed"', 'sans-serif'],
            teko: ['Teko', 'sans-serif'],
          },
          colors: {
            pitch: {
              950: '#07080b',
              900: '#0b0e14',
              850: '#10141d',
              800: '#161c28',
              750: '#1c2433',
              700: '#252f44',
              600: '#34425f',
              border: '#232c3f',
            },
            squid: {
              DEFAULT: '#ff2a6d',
              400: '#ff4d84',
              500: '#ff2a6d',
              600: '#e01655',
              700: '#b80c41',
              light: '#ffe5ec',
            },
            volt: {
              DEFAULT: '#00f59b',
              300: '#5cffbe',
              400: '#1ef7a4',
              500: '#00f59b',
              600: '#00c77d',
              bg: 'rgba(0, 245, 155, 0.12)',
            },
            trophy: {
              DEFAULT: '#ffb703',
              400: '#ffc83b',
              500: '#ffb703',
              600: '#e09f00',
            }
          }
        }
      }
    }