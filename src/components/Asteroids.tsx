"use client"

import { useEffect, useRef } from "react"
import { useAsteroidStore } from "../lib/AsteroidStore"

interface Asteroid {
  x: number
  y: number
  size: number
  speed: number
  angle: number
  rotation: number
  rotationSpeed: number
  vertices: { x: number; y: number }[]
  color: string
  particles: Particle[]
}

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  life: number
  maxLife: number
  color: string
  opacity: number
  type: "ember" | "smoke" | "spark"
}

export default function Asteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const asteroids = useRef<Asteroid[]>([])
  const animationFrameId = useRef<number>(0)
  const lastCreationTime = useRef<number>(0)

  // Get settings from store
  const { maxAsteroids, minSize, maxSize, spawnRate } = useAsteroidStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas to full window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create initial asteroids
    asteroids.current = Array(Math.min(3, maxAsteroids))
      .fill(null)
      .map(() => createAsteroid(canvas.width, canvas.height))

    // Animation function
    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Add new asteroids based on spawn rate
      if (timestamp - lastCreationTime.current > 1000 / spawnRate && asteroids.current.length < maxAsteroids) {
        asteroids.current.push(createAsteroid(canvas.width, canvas.height))
        lastCreationTime.current = timestamp
      }

      // Update and draw asteroids
      asteroids.current = asteroids.current.filter((asteroid) => {
        updateAsteroid(asteroid, canvas.width, canvas.height)
        drawAsteroid(ctx, asteroid)

        // Remove asteroids that have gone off screen
        return !(asteroid.x < -100 || asteroid.y > canvas.height + 100)
      })

      animationFrameId.current = requestAnimationFrame(animate)
    }

    animationFrameId.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrameId.current)
    }
  }, [maxAsteroids, minSize, maxSize, spawnRate])

  // Create a new asteroid with irregular shape
  const createAsteroid = (width: number, height: number): Asteroid => {
    // Start from top right area
    const x = width * (0.7 + Math.random() * 0.3)
    const y = height * Math.random() * 0.3

    // Size based on min/max settings
    const size = minSize + Math.random() * (maxSize - minSize)

    // Create irregular shape with vertices
    const vertexCount = 5 + Math.floor(Math.random() * 4) // 5-8 vertices
    const vertices = []

    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2
      const distance = size * (0.7 + Math.random() * 0.6) // Vary the distance from center

      vertices.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      })
    }

    return {
      x,
      y,
      size,
      speed: 1 + Math.random() * 3,
      angle: Math.PI / 4 + (Math.random() * Math.PI) / 8, // Angle towards bottom left
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      vertices,
      color: getRockColor(),
      particles: [],
    }
  }

  // Update asteroid position, rotation and particles
  const updateAsteroid = (asteroid: Asteroid, width: number, height: number) => {
    // Move asteroid
    asteroid.x -= Math.cos(asteroid.angle) * asteroid.speed
    asteroid.y += Math.sin(asteroid.angle) * asteroid.speed

    // Rotate asteroid
    asteroid.rotation += asteroid.rotationSpeed

    // Create new particles with varied types
    if (Math.random() < 0.3) {
      const particleType = Math.random() < 0.7 ? "ember" : Math.random() < 0.5 ? "smoke" : "spark"

      const particleSize =
        asteroid.size *
        (particleType === "ember"
          ? 0.2 + Math.random() * 0.2
          : particleType === "smoke"
            ? 0.3 + Math.random() * 0.3
            : 0.05 + Math.random() * 0.1)

      const particleLife =
        particleType === "ember"
          ? 20 + Math.random() * 20
          : particleType === "smoke"
            ? 40 + Math.random() * 30
            : 10 + Math.random() * 15

      // Random position around the asteroid perimeter
      const angle = Math.random() * Math.PI * 2
      const distance = asteroid.size * 0.8
      const offsetX = Math.cos(angle) * distance
      const offsetY = Math.sin(angle) * distance

      asteroid.particles.push({
        x: asteroid.x + offsetX,
        y: asteroid.y + offsetY,
        size: particleSize,
        speed: asteroid.speed * 0.3,
        life: 0,
        maxLife: particleLife,
        color:
          particleType === "ember"
            ? getFireColor(0.7)
            : particleType === "smoke"
              ? "rgba(100, 100, 100, 0.5)"
              : "rgba(255, 255, 200, 0.9)",
        opacity: 1,
        type: particleType,
      })
    }

    // Update particles
    asteroid.particles = asteroid.particles.filter((particle) => {
      // Different behavior based on particle type
      if (particle.type === "ember") {
        particle.x -= Math.cos(asteroid.angle) * particle.speed * 0.5
        particle.y += Math.sin(asteroid.angle) * particle.speed * 0.5
        particle.size *= 0.96
      } else if (particle.type === "smoke") {
        particle.x -= Math.cos(asteroid.angle) * particle.speed * 0.3
        particle.y += Math.sin(asteroid.angle) * particle.speed * 0.3
        particle.size *= 1.02
        particle.opacity *= 0.95
      } else {
        // spark
        particle.x += (Math.random() - 0.5) * 2
        particle.y += (Math.random() - 0.5) * 2 + particle.speed
        particle.opacity *= 0.9
      }

      particle.life++
      return particle.life < particle.maxLife
    })
  }

  // Draw asteroid and its particles
  const drawAsteroid = (ctx: CanvasRenderingContext2D, asteroid: Asteroid) => {
    // Draw particles first (behind the asteroid)
    asteroid.particles.forEach((particle) => {
      const opacity = particle.opacity * (1 - particle.life / particle.maxLife)
      ctx.globalAlpha = opacity
      ctx.fillStyle = particle.color

      if (particle.type === "spark") {
        // Draw sparks as small lines
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(particle.x + Math.random() * 4 - 2, particle.y + Math.random() * 4 - 2)
        ctx.strokeStyle = particle.color
        ctx.lineWidth = particle.size / 2
        ctx.stroke()
      } else {
        // Draw embers and smoke as circles
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Draw asteroid glow
    const gradient = ctx.createRadialGradient(
      asteroid.x,
      asteroid.y,
      asteroid.size * 0.2,
      asteroid.x,
      asteroid.y,
      asteroid.size * 1.5,
    )
    gradient.addColorStop(0, "rgba(255, 150, 50, 0.6)")
    gradient.addColorStop(0.4, "rgba(255, 100, 50, 0.3)")
    gradient.addColorStop(1, "rgba(255, 50, 0, 0)")

    ctx.globalAlpha = 0.5
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(asteroid.x, asteroid.y, asteroid.size * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Draw asteroid (irregular shape)
    ctx.globalAlpha = 1
    ctx.fillStyle = asteroid.color
    ctx.strokeStyle = "rgba(80, 40, 0, 0.8)"
    ctx.lineWidth = 1

    ctx.save()
    ctx.translate(asteroid.x, asteroid.y)
    ctx.rotate(asteroid.rotation)

    ctx.beginPath()
    ctx.moveTo(asteroid.vertices[0].x, asteroid.vertices[0].y)

    for (let i = 1; i < asteroid.vertices.length; i++) {
      ctx.lineTo(asteroid.vertices[i].x, asteroid.vertices[i].y)
    }

    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Add some texture/details to the asteroid
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * asteroid.size
      const y = (Math.random() - 0.5) * asteroid.size
      const size = asteroid.size * 0.1 + Math.random() * asteroid.size * 0.1

      ctx.fillStyle = "rgba(60, 30, 0, 0.6)"
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // Get a random rock color
  const getRockColor = () => {
    const colors = [
      "#8B4513", // SaddleBrown
      "#A0522D", // Sienna
      "#CD853F", // Peru
      "#D2691E", // Chocolate
      "#8B5A2B", // Dark goldenrod
      "#A52A2A", // Brown
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Get a random fire color
  const getFireColor = (alpha = 1) => {
    const colors = [
      `rgba(255, 165, 0, ${alpha})`, // Orange
      `rgba(255, 69, 0, ${alpha})`, // Red-Orange
      `rgba(255, 215, 0, ${alpha})`, // Gold
      `rgba(255, 140, 0, ${alpha})`, // Dark Orange
      `rgba(255, 99, 71, ${alpha})`, // Tomato
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  return <canvas 
    ref={canvasRef} 
    className="absolute inset-0 h-lvh w-full z-0 select-none pointer-events-none" 
  />
}