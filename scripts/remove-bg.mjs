import { removeBackground } from '@imgly/background-removal-node'
import { readFileSync, writeFileSync } from 'node:fs'

const input = './public/vinicius-graton.jpg'
const out = './public/vinicius-graton-cutout.png'

console.log('Removendo fundo de', input, '...')
const buf = readFileSync(input)
const inputBlob = new Blob([buf], { type: 'image/jpeg' })
const blob = await removeBackground(inputBlob)
const arr = Buffer.from(await blob.arrayBuffer())
writeFileSync(out, arr)
console.log('OK ->', out, '(', arr.length, 'bytes )')
