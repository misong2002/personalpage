// Synthetic printed test page; no user image is transmitted by the smoke test.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
const chars = {
 T:['11111','00100','00100','00100','00100','00100','00100'],
 E:['11111','10000','10000','11110','10000','10000','11111'],
 S:['01111','10000','10000','01110','00001','00001','11110'],
 '1':['00100','01100','00100','00100','00100','00100','01110'],
 '2':['01110','10001','00001','00010','00100','01000','11111'],
 '3':['11110','00001','00001','01110','00001','00001','11110'],
 ' ':['00000','00000','00000','00000','00000','00000','00000'],
 '=':['00000','00000','11111','00000','11111','00000','00000'],
 M:['10001','11011','10101','10101','10001','10001','10001'],
 C:['01111','10000','10000','10000','10000','10000','01111']
};
const width=640,height=320,stride=width*3+1;
const pixels=Buffer.alloc(height*stride,255);
for(let y=0;y<height;y++)pixels[y*stride]=0;
function line(text,y){for(let i=0;i<text.length;i++)for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(chars[text[i]][r][c]==='1')for(let dy=0;dy<7;dy++)for(let dx=0;dx<7;dx++){const x=40+i*42+c*7+dx,yy=y+r*7+dy;pixels.fill(0,yy*stride+1+x*3,yy*stride+4+x*3);}}
line('TEST 123',50);line('E = M C 2',170);
function chunk(name,data){const type=Buffer.from(name),input=Buffer.concat([type,data]);let crc=0xffffffff;for(const b of input){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^(0xedb88320&-(crc&1));}const len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([len,type,data,sum]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/ingest-test.png',Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
console.log('Created synthetic test page: artifacts/ingest-test.png');
