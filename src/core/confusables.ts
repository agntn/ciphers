/**
 * Unicode 17.0.0 `confusables.txt` (2025-07-22), one group per prototype: its code points in base
 * 36 joined by `.`, a colon, then the characters that fold to it in rising order, the first in
 * base 36 and each next one as the gap from the one before. Whitespace parts the groups.
 */
const prototypeGroups = `
13q:14d 13s:14e 13t:148 13u:144 1cr:59w,17r lv:lx,1a,k6,1i,is lw:199 ld:n5,gr,1,3f,1i,6x,el 
lc:n4,177 li:lo,2q,kq,2,kr,v1z,n3e li.lj:ls,rc,ex,3k,74,3k,73,3l,3k,1g3i le:lt,ne,b7,44i,ra8 
lm:o6,g9,4j,3x,wz,jv,3k,a1,1hs,d,4d3,j4,18py lk:1kj,6w ln:18r,it lf:n6,lt 
lj:ns,gx,1,7,1,2,88,2c,1,4s,71,o,74,3k,97 mw:mv mg:ma,z,4mq lg:lh,no,b6,3qv,ds,ra7 lg.lg:5bc 
lq:5p6 lu:193 nk:nr,141,7 nm:1s0 5ae:5ax 5ag:2o6m ly:5pp mh:192,4g6 mj:5p1 mr:nb no:1rt np:1ru 
1ehq:9ln 1ehr:9lo mt:mu ll:9ik mb:14k,h,47,i9,27,3k,3k,3k,3k,3hd,1avx,1hs,l5 mc:1ri,3xs 
md:307,6ie me:m9,6,i ml:5p5 mm:5p4 mp:m8,182 18s:1r9,3,9 1e9e.18x:1dum 18t:1rm 1e9g.18x:1dun 
1e9j.18x:1dyq 1e9i.18x:1duo 1e9l.18x:1dyr 1e9k.18x:1dup 18w:lz,lf 1e9n.18x:1dys 1e9m.18x:1duq 
1e9o.19s:1dur 191:19b 19s:lp 1fg:1fm 1vn:1z7,e8,3k,3k,3k,j9,1fgp 2tk:2x4,1s3 2tl:2x5 2tm:2x6 
2tn:2x7 6i1:wvj w:4g,4bk,1vk,1,1,1,1,1,1,1,1,1,1,u,1,6,1c 2n:1kq,1cnn,1,1 
19:k7,sd,4zg,1,1,1,1c,cv,138,10k,1,15el 19.lv:8bt 19.lk:93u 19.lj:6rc,22i,1,14s6 19.mb:8bu 
19.1a:wla 9i4:1efy 18:54,11x,2m,52n,q8v 170:19o,7uu 1n:ou 17f:94l 
1m:k0,14,i9,1m,8w,1,e7,ao,2g9,7r,6,1n5,d8,ptz,i4,h47,6i,62n 1m.1m.1p:8dw 1m.6mq:8ac 
x:cj,8lq,15f4 x.x:6d8 x.1r:6dl 1r:g1,2b,1d5,20h,t31 1r.x:6dk 1r.1r:6dj 17j:94e 
1a:19c,40,h,1,4yq,q8k,7q,jsy,13bx 1a.18:wl7 1a.1a:6cl,q8l 1a.1a.1a:6cm wz7.wz7:wz8 
53:p3,3a8,jo,1tj,5,du,4s,298,ju,nf8,hcm,bg 53.53.53:6wf,21l 53.1o:404 53.1q:3zr,9,2vr 53.1g:46n 
53.2q:41q 53.2q.lj:41s 53.2s:41m 53.22:42g 53.24:43a 53.28:41i 53.2d:40n 53.2e:3zu 53.g5:3zw 
53.pf:432 53.pg:3ym 53.11k:40p 53.3y9:3yk 53.3yc:3yo 53.3yd:3yq 53.3ye:3ys 53.3yi:3yv 53.3yj:3yx 
53.3zm:3zy 53.3zo:402 53.3zt:406 53.40f:40r 53.40g:40k,9 53.40h:40v 53.40l:40x 53.40m:40z 
53.417:41g 53.41a:41k 53.41c:41o 53.421:42a 53.423:42c 53.424:42e 53.426:42i 53.428:42k 
53.429:42m 53.42r:430 53.42u:434 53.42v:436 53.42w:438 53.42z:43c 53.43k:43t 53.43m:4w6 
53.43n:4w8 53.43o:4wa 53.43p:4wc 53.43r:43v 53.43s:43x 53.443:44c 53.445:44e 53.446:44g 
53.447:44i 53.448:44k 53.44a:44m 53.44b:44o 53.44t:452 53.44v:454 53.44w:456 53.44x:458 
53.44y:45a 53.450:45c 53.451:45e 53.45s:45z 53.45t:461 53.45u:463 53.45v:465 53.45w:467 
53.45x:469 53.45y:46b 53.46g:46p 53.46h:46r 53.46i:46t 53.46j:46v 53.46l:46x 53.46m:46z 
53.477:4we 53.47a:4wf 53.47b:4wg 53.47c:4wh 53.47d:4wi 53.47f:4wj 53.47g:47i 53.47u:47v 
53.487:488 53.4vl:4vn 53.4vo:4vq 53.4vs:4vt 53.4w0:4w2 1us:x80 1us.1us:1ut 5kr.5kr:5ks 
37u.37u:37v 59k.59k:59l 59m.59k:59n 5em.5em:5en 1gly.1gly:1glz 1ikr.1ikr:1iks 1iyp.1iyp:1iyq 
1k5d.1k5d:1k5e 5mm.5mm:5mn 
13:2o,2c,ed,2,1,1,1,a,2,1,15,3k,g,d2,3,3g,q,e9,1,2fp,hu,1rl,2,1c,e,1,q,1,2,n,3,qqf,ha3,1l,m4x,1 
13.13:y,ig,z,h,8,l8,2,4in,nd,1,2,k,3,34d,14vz 13.13.13:6d0,3 13.13.13.13:6dz 13.1u:ap 13.1w:ay 
13.32:95 13.28:bo 13.2c:bw 13.2h:c3 14:7s8,a,1pe,14iy,e5 14.14:948 14.9oc.15:9wg 14.1e.15:779 
14.1e.27.15:77r 14.1f.15:77a 14.1g.15:77b 14.1h.15:77c 14.1i.15:77d 14.1j.15:77e 14.1k.15:77f 
14.1l.15:77g 14.2p.15:78c 14.1t.15:2q6o 14.2q.15:78d 14.1u.15:2q6p 14.2r.15:78e 14.1v.15:2q6q 
14.2s.15:78f 14.1w.15:2q6r 14.2t.15:78g 14.1x.15:2q6s 14.2u.15:78h 14.1y.15:2q6t 14.2v.15:78i 
14.1z.15:2q6u 14.2w.15:78j 14.20.15:2q6v 14.2x.15:78k 14.2y.15:78l 14.22.15:2q6x 14.2z.15:78m 
14.23.15:2q6y 14.30.15:778,1f,2iy9 14.24.15:2q6z 14.30.1e.15:77j 14.30.1f.15:77k 14.30.1g.15:77l 
14.30.1h.15:77m 14.30.1i.15:77n 14.30.1j.15:77o 14.30.1k.15:77p 14.30.1l.15:77q 14.30.30.15:77i 
14.30.27.15:77h 14.25.15:2q70 14.32.15:78p 14.26.15:2q71 14.33.15:78q 14.27.15:2q72 14.34.15:78r 
14.28.15:2q73 14.35.15:78s 14.29.15:2q74 14.36.15:78t 14.2a.15:2q75 14.36.32.15:78o 14.37.15:78u 
14.2b.15:2q76,8 14.38.15:78v 14.2c.15:2q77 14.39.15:78w 14.2d.15:2q78 14.3a.15:78x 14.2e.15:2q79 
14.3b.15:78y 14.2f.15:2q7a 14.3c.15:78z 14.2g.15:2q7b 14.3d.15:790 14.2h.15:2q7c 14.3e.15:791 
14.2i.15:2q7d 14.3cw.15:9vk 14.xz4.15:9vy 14.3cy.15:9vl 14.yvs.15:9vz 14.3cz.15:9vm 
14.zc4.15:9w0 14.3d1.15:9vn 14.108s.15:9w1 14.3d2.15:9vo 14.10p4.15:9w2 14.3d3.15:9vp 
14.115g.15:9w3 14.3d5.15:9vq 14.1224.15:9w4 14.3d7.15:9vr 14.12ys.15:9w5 14.1350.13ic.15:9wd 
14.1350.16f8.15:9we 14.3d8.15:9vs 14.13f4.15:9w6 14.13p8.15:9wc 14.3da.15:9vt 14.14bs.15:9w7 
14.3db.15:9vu 14.14s4.15:9w8 14.3dc.15:9vv 14.158g.15:9w9 14.3dd.15:9vw 14.15os.15:9wa 
14.3de.15:9vx 14.1654.15:9wb 14.fer.15:9wm 14.fex.15:9wi,2gin 14.fh9.15:9wo 14.fik.15:9wh,2gip 
14.fis.15:9wk 14.fkz.15:9x5 14.flt.15:9x9 14.fm9.15:9xd 14.g2z.15:9wn 14.g31.15:9wl 
14.gc4.15:9x4 14.gd9.15:2qfb 14.gg1.15:9wp 14.ggk.15:9xb 14.glp.15:9x0 14.gos.15:9x6 
14.h5n.15:9wj 14.h7j.15:9wv 14.i1y.15:9x7 14.i2x.15:2qf7 14.jf7.15:2qf9 14.k0n.15:2qfc 
14.k4l.15:9ww 14.kco.15:9wq 14.kcp.15:9wy 14.kdk.15:9wt 14.kdo.15:2qf4 14.kkq.15:9wx 
14.ldg.15:9ws 14.m7f.15:9wr 14.m9l.15:2qf8 14.mm1.15:9x1 14.nh3.15:2qfa 14.nhf.15:9x8 
14.ny6.15:9wz 14.nz1.15:9x3 14.nzh.15:9xc 14.pnu.15:9xe 14.po3.15:9xf 14.rs1.15:9x2 
14.rt3.15:9xa 14.ssx.15:9wu 15:7s9,a,1pe,14iy,e6 15.15:949 3f:7sk,2c2o 3h:7sl 7vq:9i2 7vr:9i3 
7sc:6y1,xr,1ls,1z,b0,2pl9 7sd:6y2,xr,1ls 1e7z:1ef2 52:94v 16:19p,541,cp,18g8 
1b:4l1,1sc,3,cx,nw,gq,fh,jy,1,fw,8g,4b,79,5m4,24mz 1b.lg:8ae 1b.1b:8hp 1b.1b.1b:8hn 
2k:6qe,14n,fc,4,zt,k2,5lu,ysy,5w,15n7,18 2k.2k:762,1pr 2k.40l:7uw 12:x2w 1v4:25s,5h8,1a8f,7g 
xdo:1i3f 2tr:4pl 2u2:4ph 2u3:4pm 2yz:2z0 2z1.2z1:2z2 2m:jo,2 jr:k8,wbq 
jt:4v,68f,11y,16t1,1,1,1,bb jt.2q:ui jt.2q.2x:wup jz:ol kq:l7,wez kr:x04 kz:9he 
4w:ka,666,qb,r,1my 4w.mq:6zg,1aic 4w.lk:6zo 4w.1v:6ir 4w.1y:6ix 2cz:2d1 2ze.2ze:2zf 2ze.2zh:2zj 
2zh.2ze:34e 2zh.2zh:2zi 4p:794 4u:79j 6jb:79h 6kk:2k2j 6n2:8oc 6n3:8od 6n4:8oe 6n5:8of 6nm:6np 
6o3.6o2:86d 6o3.4ii:86n 6pu:2l0b,1m,1m,1m,1m,3d5 6pu.mt:6o,2od9 6px:6ww 
6pz:1jfs,11jt,1m,1m,1m,1m 6pz.lk:6zm 6pz.ms:6zv 6q6:7ew,o 6q8:8cf 17:4j1,3ag,179i,193i 17.le:8bn 
17.lm:8bm 17.lf:8bo 17.lj:6qc 17.mb:8bp 17.mo:8bq 17.6f6:8br 6v:7tj 1o:jm,3g6,hm,1vr,1f9,2caw 
1o.53:405,2vl,1y6,1 1o.1o:6sq 1o.1o.1o:6vs 1p:3y8,56o,gw,mzj 1p.li:6sa 1p.le:6s9 1p.lm:6s7 
1p.lj:6s0 1p.lj.mb:6s1 1p.59u:8ly 1p.6i8:8dq 1p.1p:8dx 1p.1p.1p:8dy 1p.ob:6se 
1q:jn,3g0,2dj,1f9,1sr4,jjs 1q.53:401 1q.1o:8f9 1q.1q:6sr,1it 1q.1q.1q:6vt 3i:kc,5pg,43,dl 
3i.lk:6zs 3i.lj:8dm,qc 3i.mb:93z 6qo:2ojs 6qv:6v4 6r2.6r2:6r3 6r2.6r2.6r2:6r4 6r8:94b 6r9:94a 
6rb:94c 6rs:1i3i 6rz:7ke,2jv4 6sh:6sj,21g 6tp:8ar 6tq:8as 6tr:2k3c 6ts:2k3d 6tv:8at 6tw:8au 
6tz:8aq 6u3:6zj 6u8:2rg1 6u9:2rf9 6uq:7gh 6ur:7g7 6va.lk:6zn 6x3:1e7o 6xe:7hc 6xl:8cd 6xw:6xx 
6yj:893 6ym:7gu,s0 6yq:891 6yx:88g 6yz:72b 6z2:72a 6z9:729 6zx:72e 70o:7js 730:1e7p 731:1e7q 
732:1e7r 733:1e7s 734:1e7t 735:1e7u 739:7g1 73v:73w 7b6:7b7,16we,8b 7bg:7bj 7bw:7c3 7f0:7f4 
7fa:7fb 7fc:7fh 7fl:7io 7fu:1ejx 7g6:7g8,2 7jb:8vd 7jd:2rd6 7jx:2qky,7 7jy:73y,2jh6 87u:89l 
89r:2rei 8bj:8ce 2jx4.2jxh:7l5 2jx4.2jxh.2jxq:7l6 2q6l:7ai 2q6m:6nu 2rco:2j23 1v5:k9,22d 
9oc:3g3,2w1,1,yz,1,1z3,gx,33,5kg,hrr,h7a 9oc.9oc:3h2 9oc.3fl:16m1 9oc.3fp:16m2 9oc.3fp.ffs:16m3 
9oc.3ft:16m4 9oc.3fy:3h1 9oc.ffs:3g4,6b2 9oc.ffs.3fy:3h3 10.6hs:2q6n 4j:6g4 6go:9hu,10 5e8:5ek 
xjk:xja 1yf:1ioh 2g7:2jr 37l:38l 7sw:76o 7t5:76x 6f5.6f4:73c 
1e:br,g1,3br,sqt,4r,2z,1lzs,25a,a,a,a,a,73u 19e:1de,w65 1uw:240,1k 1yg:1ioi 2g8:2js 7sx:76p 
1e.mt:cb 1e.18:2q6b 1e.1a:77t 1e.1e.k4l:a9h 1e.1e.m9l:a5q 1e.1f.k4l:a9i 1e.1f.m9l:a5r 
1e.1g.k4l:a9j 1e.1g.m9l:a5s 1e.1h.k4l:a9k 1e.1i.k4l:a9l 1e.1j.k4l:a9m 1e.1k.k4l:a9n 
1e.1l.k4l:a9o 1e.30.k4l:a9g 1e.30.m9l:a5p 1e.27.1a:78b 1e.27.k4l:a9f 1e.27.m9l:a5o 2qw.2q7:2qx 
2qw.2qb:2r3 1e.k4l:a8x 1e.kco:a0x 1e.m9l:a56 
1f:c7,2t,e3,5l,w9,ao,6nn,14,8,o7y,1t,mcf,h2p,iig,103,157,a,a,a,a,73u 19f:1df,2n6e 7sy:76q 
1f.me:wo 1f.18:2q6c 1f.1a:77u 1f.30.k4l:a9q 1f.27.k4l:a9p 1f.k4l:a8y 1f.kco:a0y 1f.m9l:a57 
1g:3wu,1fj5,zlx,25a,a,a,a,a,73u 19g:1dg 1uy:25m 7sz:76r 1g.18:2q6d 1g.1a:77v 1g.53:46o 
1g.k4l:a8z 1g.kco:a0z 1g.m9l:a58 1h:cc,1j3z,zlm,25a,a,a,a,a,73u 7t0:76s 1h.18:2q6e 1h.1a:77w 
1h.k4l:a90 1h.kco:a10 1h.m9l:a59 1i:rw,1x,33x,4x0,1,9,1am1,zkx,25a,a,a,a,a,73u 19i:1di 1yk:1iom 
7t1:76t 1i.18:2q6f 1i.1a:77x 1i.k4l:a91 1i.kco:a11 1i.m9l:a5a 
1j:1fiq,3xw,zld,10b,14z,a,a,a,a,73u 7t2:76u 1j.18:2q6g 1j.1a:77y 1j.k4l:a92 1j.kco:a12 
1j.m9l:a5b 1k:f6,1,1jb,3k,49,1d07,13vi,25a,a,a,a,a,3bh,3sd 1v2:25q 7t3:76v 1k.18:2q6h 1k.1a:77z 
1k.k4l:a93 1k.kco:a13 1k.m9l:a5c 1l:1yl,3e,75,ed,671,1,o83,mda,w,a,zkz,25a,a,a,a,a,73u 
19l:1dl,ha,1hml 2gf:2jz 7t4:76w 1l.18:2q6i 1l.1a:780 1l.k4l:a94 1l.kco:a14 1l.m9l:a5d 
2p:gh,9s,3j,66i,17ev,161l,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m o3:92u 
1t:pd,3j,32y,ez,sa1,htf,ov,lgg,ihi,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m 
2p.mq:706 77:cu 76:ct 6d:fb 5h:fa 61v:61m 2p.1b.2r:6io 2p.1b.37:6ip 2p.2p:x0z 1t.1t:x0y 
2p.2t:6e,rz 1t.1x:5i,su 2p.33:x11 1t.27:x10 1t.2a:2rd3 2p.39:x13 1t.2d:x12 2p.3a:x15,2 
1t.2e:x14,2 2p.3d:x19 1t.2h:x18 5q8:xve 8rz:4as,2f0,pv3,1nhk 8s0:1fdr 
2q:as,iw,337,4j,8t,1w5j,k11,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
1u:pe,3k,34y,eb,27p,28m,nri,kk,h9q,o0,v,2o,13va,1ey,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m 
2q.lw:gj 2q.lj:41f 2q.lg:aq,1,i6 2q.mt:ao,ki,1,15,1 2q.53:41r 2q.lj.53:41t 2q.13:420 2q.30:tn 
ih:tu,34a,4uf 2r:s2,27,2bn,2e,2i2,vt,27c,p3e,gic,ze,1527,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
o8:92l 
1v:s9,14,33y,2lf,17,1s,27r,nqu,hu1,ov,2o,7n,7b,3wt,9,zja,1ey,1g,1g,1g,1g,4c,1g,1g,1g,1g,1g,6hm 
2r.mw:4i,be 1v.6i3:6g1 1v.6hs:2q9a 2r.me:6f,qs 1v.me:5j,rn 1v.13:av 2r.1b.33:6it 2r.1b.39:6iu 
a84.9.6hp:2q99 x3n:gr,9m,1s,2n,59,5wj,1w5,p3m,hhq,42t,11iw,m,10,m,10,m,10,m,10,m x3m:sk,5ns,2cc 
x3n.mq:707 x1b:ot x1a:sf 2s:zl,2xy,3s,2jb,1k,pxw,1nwr,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
1w:3vk,fy,c,28r,15,pyd,1mh2,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 2s.lw:gn 2s.mg:gm 2s.lg:b0 
2s.mt:7l 1w.mt:5s,1s,3d 2s.mt.mp:6gb x2x:x2y 2s.53:41n 2s.13:41z 2s.f1:is 2s.3e:dv,4w 1w.3e:du 
1w.2i:dt 2s.am:cm 1w.am:cl 1w.al:ck 2s.i9:it 5qd:xv4 61r:qc,ca,361,4me,9o,2bv0,1m,1m,1m,1m 
2t:tx,3s,5m9,1,o,r8r,glv,161l,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g o4:92v 
1x:ph,3k,32v,2o4,cv,20q,nnb,hth,o1,4dc,8,zl8,1ey,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m 
7p:7v 7o:7u 2t.mw:g7 1x.mw:g6 2t.mg:xr 5qf:xvg d9:gp,hs b2:6pv,27r,nnb d9.ke:gq d9.33:5qs 
d9.33.mw:xtt d9.33.mt:xtu b3:yg b4:100,2wr,2m4,18u2,l64,jjo 5sb:5un gs:tz,4wh gs.me:wp gu:1feq 
ii:x3x,ia5 2u:an,j,s2,4yh,r24,po,1mne,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
1y:rg,3iw,29p,q0c,jf,hyn,u,hs,3ul,w,zkp,114,du,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g,9h 1y.me:b5 
2u.ms:5ta 1y.1t.2g:6kb 2u.2u:1dkw 2u.2u.2x:1dkz 2u.2u.30:1dl0 2u.2x:1dkx 2u.30:1dky 2u.32.mh:ix 
6k2:4ad,sa1 x6j:4af,2fsp 2v:b1,5w,m8,4qq,p3,17wd,161l,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g 
1z:zw,2wk,1f,smb,1mh2,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 5sd:5uq 2v.lw:gw 7z:dj 7y:di 83:dx 
2v.mt:dh 1z.mt:dg 1z.13:b7 gy:zx,2y6,txx 
2w:xn,51,2tu,2mk,17wa,161l,2w,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
20:pj,3q,332,ch,2a7,1,1,29t,nrt,htt,pz,13wu,1ey,1g,1g,2w,4c,1g,1g,1g,1g,1g,1j,1m,1m,1m,1m 
5ro:5tk 2w.lw:h2,3gs,syr 20.mh:wy,7ut 2w.mt:87,ms,5o4 20.mt:86 20.me:xz,2 ik:u5,7yq,p30 ik.mh:wz 
ik.me:y0,2 dy:zu 8s6:xvk 8s5:og,37c,8,t1d x0n:x3p 
2x:8h,8o,1,35,4f,1r,4d,8c,2sj,2e1,aj,f,14,eb,1sw,o1g,10u,gk4,516,110f,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,i,12,1m,1m,1m,1m 
79a:7a3 2x.mq:708 8d:cw 8c:cv 2x.mt:h4,5cj,1 2x.2x:6lt 2x.2x.2x:6lu 2x.2y:8j 2x.3a:6lv 2x.3c:6m0 
2y:s3,2t,5pt,17up,161l,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
22:ov,3t,337,6a,si4,k9,ha0,14mt,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 2y.mt:g9 22.mt:g8 
22.53:42h fr:12t,2jw0 5qi:xvf 2z:2kh0,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
23:pm,3k,34c,kv,21h,296,nr7,huc,165,13go,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1j,1m,1m,1m,1m 
2z.lw:bd 23.mh:wq,7v3 23.mt:wu,5jj,qkz 23.13:bc 
30:1d,o,1f,7u,16,d5,31,56,f,6p,l,a,20,1m,40,61,2yf,21b,1,2,25,s,4n,d6,1p1,59,nmr,hp7,1,4b,z,4c,iq,3j,n,5a2,7,fyh,3i,iie,j,1ef,t,n,t,n,t,1g,n,t,1g,n,t,n,t,n,t,n,t,n,t,n,t,n,t,r,1m,1m,1m,1m,1j,a,a,a,a,3bk,115,3k,2nl 
24:3xa,5o,2g8,2i,290,npt,it6,7f,3ul,f,h2c,iiz,11l,dd,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g 
30.ln:1e0s,1 30.mw:8y 24.mw:8x 30.mg:h9 30.mt:bb,3 30.ms:h7 30.191:17p,26,1d04,1 30.53:8v,1,3uf 
30.18:2q6a 30.1a:77s 30.13:169 30.1e.1a:783 30.1e.k4l:a97 30.1e.kco:a17 30.1e.m9l:a5g 
30.1f.1a:784 30.1f.k4l:a98 30.1f.m9l:a5h 30.1g.1a:785 30.1g.k4l:a99 30.1g.m9l:a5i 30.1h.1a:786 
30.1h.k4l:a9a 30.1h.m9l:a5j 30.1i.1a:787 30.1i.k4l:a9b 30.1i.m9l:a5k 30.1j.1a:788 30.1j.k4l:a9c 
30.1j.m9l:a5l 30.1k.1a:789 30.1k.k4l:a9d 30.1k.m9l:a5m 30.1l.1a:78a 30.1l.k4l:a9e 30.1l.m9l:a5n 
30.2y:cp 30.22:8i 24.2y:co 24.22:cn 30.30:ch,tr,55y,97,5g 30.mt.30.mt:1evt 30.30.1a:782 
30.30.30:6le 30.mt.30.mt.2b.mt:1evs 30.30.k4l:a96 30.30.kco:a16 30.30.m9l:a5f 30.27:tq 
30.27.1a:781 30.27.k4l:a95 30.27.kco:a15 30.27.m9l:a5e 30.37:iy 30.38:6gm 30.2e:6lf 30.2g:6lk 
30.f1:ha 30.3e:iz 30.19w:17n,27,3,1czy,1 30.18j.17s.181:1e5v 30.18k.18k.18x.19s.33:1e5u 
30.k4l:a8w 30.kco:a0w 30.m9l:a55 in:8up,p25,hhx 
25:po,2m,y,32z,ft,6e,21p,1o,27d,nrb,hu6,oz,2p,13v5,1ey,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g,1j,1m,1m,1m,1m 
25.me:y5 25.1u:2rfv 5wf:92g 32:12w,4,2je3,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
26:pp,5tk,29x,nra,hu6,15x,13gw,1ey,1g,1g,1g,1g,1g,2w,1g,1g,1g,1g,1g,1j,1m,1m,1m,1m 26.lm:1evi 
32.mg:hf 32.mh:97,2b,ex,cb,2jx2,1m,1m,1m,1m 26.me:bh 32.ms:5tc 32.2y:cs 26.2y:cr 26.22:cq 
26.33:6ja hg:8t7 5qm:on,5d,1el1 he:92 
33:qn,4,16,29,93,2k,2u,u,2h,3,k,w,hd,3k,3k,3k,3k,3k,s,2s,s,3k,u,1y,s,5q,3k,99,z,5b,1cx,10v,2,tf,297,p0e,fvt,1,1,1,1,1,1,1,n0,1,1,1,2r,yl,5a,352,s8,f,1101,1g,1g,2w,1g,1g,1g,1g,1g,1g,1g,1g,1k,4,1i,4,1i,4,1i,4,1i,4,4fc,1s,w 
27:1c,of,3j,8n,h7,o0,cm,162,53i,52,j7,n3g,hto,o3,p,9l,5a,2c,3vj,17,zk,ykk,c,1em,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m,1c,a,a,a,a,73u 
56:5si,m6 9b:cy 9a:cx 33.le:1dr 5y:9c 33.mw:6w,xmu 27.mw:60,8rt 27.mw.ld:e6 
33.mt:hh,e6,3a,7u0,o8q,ub,19 
27.mt:bj,e1,w,p,z,3i,3a,2xi,19,2wb,7,5r,1t0,4h,o49,1n0w,wl,a,g,k,c,a,g,k,c,a,g,k,c,a,g,k,c,a,g,k,66n 
33.m3:xv8 33.19s:1dy1 27.18:2q69 27.1a:2q68 33.13:bl 27.13:bk,3k4 56.1b.6f4:11,18l,548 
56.1b.6f4.6f4:16x,55z 56.1b.6f4.6f4.6f4:16y,55z 33.2t:9f 27.1x:9e 33.5qf:hi 33.33:6qm,q63,52 
27.27:wwo,52 33.17w:1du9,3q 33.18l:1dua,3q 33.18l.17w:1e37 33.18l.18l:1e38 33.18p:1dub,1 
33.2ls.33:2n3 33.370:368,5j 27.m9l:a54 gk:or,51x,vo,18sn au:sd,5ty,py0,itk gk.mw:xtr gk.2t:xuq 
hj:1fen 
34:72,5d,ea,1c,7,20,65w,1tb,18,15kx,161l,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1l,e,18,e,18,e,18,e,18,e 
28:pt,3j,342,3v,2i4,2a1,18,npf,hun,o5,13yo,1ey,1g,1g,1g,1g,1g,2w,1g,1g,1g,1g,1g,1l,1m,1m,1m,1m 
34.lw:bp 34.mt:5tp 34.53:41j 28.13:41y 5qw:5rd,s5l 
hk:qu,f,33,7zb,1h,1,2c52,8,1e,8,1e,8,1e,8,1e,8 
35:10b,20,3,2jes,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
29:6je,2ez,2a35,1ey,1g,1g,1g,1g,1g,2w,1g,1g,1g,1g,1g 35.lw:io 29.1x:2rcw gb:5u8 
8o:qi,1i,22,4wh,32i,p41,1n2t,j,13,j,13,j,13,j,13,j 8o.mh:wr 8o.mt:wv 
36:tv,4xf,31b,p1e,1,1l,1mlm,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
2a:bq,3jv,1d,c5,2ac,1,1,q12,ixd,l1d,iia,10v,e3,1g,1g,2w,4c,1g,1g,1g,1g,1g 36.mg:hp 36.mh:ho 
36.mt:gd,g6 36.ms:5te 36.13:wh 36.32:31,6j6,1cht,df,10zn,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
36.32.mw:6g5 36.32.me:hd 36.32.ms:5tb 2a.37:6g8 hs:xv5,1d 5qx:un hq.ms:5tf hr:6jt 
37:cd,ig,1qi,ufm,vt,gix,z9,41l,110r,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
2b:sl,96,2va,5,snc,hu9,o3,ay,l5m,ii6,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 37.mg:hu 37.ms:5tg 
67:qa,u,36o,23y,r2v,x,1nu5,1m,1m,1m,1m 37.37.37:2rfg 37.38:1dl2 hv:6qz,r36 
bt:pv,5ul,5t,27s,2c1d,1m,1m,1m,1m hv.hv:6r0 hv.hv.hv:6r1 hv.hv.hv.hv:8b0 
38:2kh9,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
2c:pw,3i,328,2yq,111,y5,nqm,huo,o3,q,2s,49z,h1q,ijj,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m,69x 
38.lw:bx 2c.lk:6zl 2c.mw:fy 9u:ey 2c.mg:by 2c.mh:x8 2c.6i3:6ge 38.mt:9z 2c.mt:9y 38.ms:5th 
x3a:3a8 2c.1f:x0o 38.gl:iw 2c.1x.24:6jl 38.2u:x2v 38.37:iu 38.hv:iv 38.f1:x0p 
5qz:qs,3i,7z9,p1n,1n4z,1m,1m,1m,1m 5qz.mh:x9 bv:9v,54,3hg 
39:i3,8q,c8,4nz,rcz,q7,4,hpg,3xe,1106,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m 
2d:11p,2ib,gc,2qm,49,ppt,ixm,3xm,h3e,ii0,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g a5:d0 a4:cz 
39.mh:v3 39.mt:5tq,s2m 2d.mt:g4,3go 2d.53:40o 2d.13:413 39.2t:5t7 39.33:xur xu9:5z7 hc:12y,2i1 
c1:4dq,6,25v i2.mt:5tr 
3a:ql,54,9v,4lk,us,50,49,r1k,gj1,4og,ca,110v,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1b,1m,1m,1m,1m 
2e:vo,dv,40,2jm,2e,2lx,2c4,nn2,e1,im6,3ur,h2g,ijn,10i,eg,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
2e.mt:1evr 2e.53:3zv 2e.1u:2rfw 3a.2x:6lx 3a.2x.2x:6ly 3a.2x.2x.2x:6lz 2e.30:6lh 2e.30.30:6li 
2e.30.30.30:6lj 2e.5wk:2rd4 i4:5rb,31s,16pt 
g5:pn,3k,gd,40,2m1,4xy,nn2,dl,7g,hwz,f7,l1p,kfp,1m,1m,1m,1m g5.mw:x5o g5.me:xx g5.53:3zx 
3b:hb,d5,p,58,1w,4ow,330,p1i,l8n,4,1,11cx,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
2f:10c,2vr,x,snq,mws,9,zjx,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 3b.w6.w7:vx 3b.lj:1io5 
2f.mt:6g9 3b.me:x29 i5:u4,4wh,32k,p2m i5.me:y6 
3c:5z,oe,3cs,1o,6p,26j,1iq,1,77,163t,161l,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g of:92n 
2g:pz,3i,3m0,22,242,sq,1fd,4x,nm6,js,had,ns,10,2r,b,ed,3wl,zk1,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1j,1m,1m,1m,1m 
3c.lj:8c0 2g.mh:xe 2g.mt:1evq 3c.2x:6m2 3c.2x.2x:6m3 2g.30:6lm 2g.30.30:6ln 
3d:gz,18,84,40,30,2ew,2hx,ab,fy,298,p0x,glb,51f,1106,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,y,1m,1m,1m,1m 
2h:px,19,29,3v,2yj,k,4x7,nr8,hu5,op,4c2,h3z,ii3,1ey,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1m,1m,1m,1m 
3d.lw:c4 3d.mt:gf,gy 2h.mt:4l,bt,gy f1:ia,gf,2du,5hu,8,o7y 
3e:5r6,s4x,lkh,110v,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 
2i:pi,371,2n5,4,q0k,hum,qj,4ac,1o,zka,1ey,1g,1g,1g,1g,4c,1g,1g,1g,1g,1g,10,1m,1m,1m,1m 3e.mg:i8 
3e.mt:c6 2i.mt:c5 3e.me:f9 2i.me:f8 3e.ms:5ti 8rw:8st 8rv:8ss ib:8t9 66:s7,1eq5 x5f:x5e x5h:x5g 
x2o:6ex bs:rt,4zf,r35 at:uk,x1v,12k2 at.2x:uj g2:xvi jl:kk ip:wy5 ci:7e2 ig:6u1,og,s7,nt,nwv,imz 
pf:sz,332,6s,2hl,286,1rpf,kgz,1m,1m,1m,1m pf.mt:wi pf.53:433 pf.13:wg 
pg:3yb,2rn,q5,1cj,62,163p,u,lfb,kgh,1m,1m,1m,1m,67j pg.mq:6zd pg.53:3yn pg.3z4:3zg rh:2l6z 
qe:2kzr,1m,1m,1m,1m rb:8v8 qj:8t2,ocl,idc,15gx,1m,1m,1m,1m qj.mw:bf qk:51,2kuw,1m,1m,1m,1m 
qm:2kzz,1m,1m,1m,1m pq:7jk,1ae,2c5b,1m,1m,1m,1m 
qo:ra,2x,4x5,t0,291,1rmo,kk0,g,16,g,16,g,16,g,16,g ps:tb,5r4,5s,235,o57,13gr,kk1,1m,1m,1m,1m 
rc:1f3h,2t sc:8u9 qq:rf,81c,2c7c,1m,1m,1m,1m py:tg,8f,2jx,xc,4ai,16a1,15vu,1m,1m,1m,1m 
qv:8tp,p0m,2,1n5v,1m,1m,1m,1m qw:vl,7y6,16q2,15gg,1m,1m,1m,1m 
q0:vk,3mw,4ba,169z,f0,15gu,1m,1m,1m,1m qx:705,1to,o0s,a2,1nvn,1m,1m,1m,1m 
q1:4dr,6,25t,18k0,15vu,1m,1m,1m,1m qx.mq:709 6b8:67x ty.mh:wn t2.mh:wm t4:om,w8b,ih0,14o6 st:t5 
st.me:wa u1:v1 u1.me:wb xv:1fi4 u3:5rf u3.me:xy ux:xuo wvd:1fjf 92k:5wu sr:1fil zi:2k1u 
v4:3wn,fc,2fqr v4.w6.w7:vw v4.53:4x9 wuk:8ts,oau uf:rp,1c5,1t tj:ro xj:y4 xi:y3 xo.mg:xq tk:8u4 
tm.30:wuo tp:6iw wuw:20ik,qud 8qn:xhu 12d.2x:13b 12p:3o4 12s.12d:1dlg 12s.12j:1dlh 12s.12l:1dlj 
12s.12u:1dlf 11k:3mo,dq,2qj,49,ppv,1nio 11k.53:40q 11k.13:414 132.12u:1dli 11w:6gt,2df,14,160o 
121:jj,k 15c:6k5,171o 1dm6:1dm7,1 15c.15o:1dn3 15d:6k6 15e:6k7 15f:6k8,171m 15g:1dlv 1dlp:1dmh 
15n:1dlw 15o:1dlx 15p:1dly 15u:1dls 160:1dlz 1dm2:1dm3,u 1dm4:1dm5 162:1dm0 17l:1e9s 
17l.1hiy:1dp 17m:1e9t,1 19t:1dn4,1 17s:1ea7,1,1,1,1ban,w,1s,w,w 17s.1cr:1g1 17s.1cy:1py 
17s.190:1pd 17s.33:1dwg,1u 17s.17w:1ds5,47 17s.17x:1ds6,47 17s.17x.18p:1e4i 
17s.17y:1ds7,1w,2b,1g 17s.17y.18p:1e3i 17s.181:1duy 17s.182:1duz 17s.18l:1ds8,2s,1f,1u 
17s.18m:1dv1 17s.18p:1ds9,1,2s,1 1a3:1cg,1caq,1,1,1,3z,1,1,1 1a8:1dne,1,1,1,3u2 1g4:1gn,8y 
17t:6u,159,5nm,17am,1 17u:1a2,1cdg,1,1,1,ms,1,1,1,1bb1,w,1s,w,w 17u.li:1q7 17u.33:1dwl,1r 
17u.17w:1dsb,46 17u.17w.18l:1e1c 17u.17w.18p:1e3j,1 17u.17x:1dsc,46 17u.17x.17w:1e1d,1 
17u.17x.18l:1e1f 17u.17y:1dsd,46 17u.17y.18l:1e1g 17u.17y.18p:1e3l,1 17u.181:1dv4 17u.182:1dv5 
17u.18l:1dse,2s,1e,1r 17u.18l.17w:1e1h 17u.18l.17x:1e1i 17u.18l.17y:1e1j 17u.18l.18p:1e3n,1 
17u.18m:1dv7 17u.18p:1dsf,1,2s,1 1a7:1dnm,1,1,1 17w:1eal,1,1,1,1baa,w,w,w,w,w 17w.17x:1dsl,42 
17w.17x.18p:1e3q,o 17w.18k.w.17w.18k.30.18k.33:1e63 17w.18l:1dsm,42 17w.18l.17x:1e1k,1 
17w.18l.18p:1e3p,2 17w.18p:1dz5,1,r,1 1ab:1do6,1,1,1 1ac:1do2,1,1,1 1ae:1doa,1,1,1 1ae.li:1q9 
1af:1doe,1,1,1 17x:1eap,1,1,1,1bab,w,w,w,w,w 17x.1cr:1ad 17x.190:1a9,6p 17x.17w:1dsn,42 
17x.17w.18p:1e4f 17x.18l:1dso,42 17x.18l.18p:1e1m,1 17x.18p:1dz3,1,r,1 
17y:1eat,1,1,1,1ban,w,w,w,w,w 17y.17w:1dsp,42 17y.17x:1dsq 17y.18l:1dsr,41 17y.18p:1dz7,1,r,1 
17z:1eax,1,tz,1ag2,3k,w 17z.179:1ag,1ce8,1 17z.1cr:1am,1,1cdz,1 17z.le:1da 17z.mc.mb:1pq 
180:1eaz,1,1bak,3k,w 180.19s:1duj 1ai.179:1aj 1ak:1dok,1 1al:1doi,1 181:1eb1,1,1bad,3k,w 
181.179:1ap,1ce3,1 181.1cr:1aw,1cdu,1 181.li:1aq 181.li.lj:1q1 181.le:1db 181.190:1gs 
181.19s:1duk 181.183.18o.18k:1e5y 181.18p.30.18k:6gx,17p7 182:1eb3,1,1b9y,3k,w 182.le:1pu 
1av.179:1gx 183:1eb5,1,1,1,1ba2,w,w,w,w,w 183.1cr:184,1d35,1,1,1,1ba4,w,w,w,w,w 183.le:1ha 
183.33:1dyg,21 183.1cr.33:1dyi,20 183.17w:1dss,41,3r 183.1cr.17w:1dzd,s,8,a 183.17w.17x:1e1p 
183.17w.18p:1e1q 183.1cr.17w.18p:1e21 183.17x:1dst,41,3r 183.1cr.17x:1dze,s,8,a 183.17x.17w:1e1o 
183.1cr.17x.18l:1e1z,1 183.1cr.17x.18p:1e3u 183.17y:1dsu,41,3r 183.1cr.17y:1dzf,s,8,a 
183.17y.18p:1e3s,u 183.181:1dzi,s 183.1cr.181:1dzh,s 183.18l:1dsv,41,1j 183.1cr.18l:1dyh,z,s,8 
183.18l.17w:1e1t 183.18l.17x:1e1r,1 183.1cr.18l.17y:1e22,1 183.18l.18l:1e1u,1 
183.1cr.18l.18l:1e24,1 183.18p:1dyz,1,r,1 183.1cr.18p:1dz1,1,r,1 
185:1ebd,1,1,1,ty,1afz,w,w,w,w,w 185.1cr:1b2 185.mc.mb:1pr 185.17x:1dsw,41 185.17x.17x:1e1w,1 
185.17x.18p:1e3t 185.17y:1dwy 185.181:1dzj,s 185.18k.189.18l:1e5x 185.18k.18p:1e5s,9 
185.18k.18p.w.30.18k.18k.33.w.189.18k.18p.33.w.18o.183.18k.18l:1e62 185.18l:1dsx,42 
185.18l.18l:1e1y,2n 185.18p:1dz9,1,r,1 186:1ebh,1,1,1,1ba1,w,w,w,w,w 186.17w:1dsy,42 
186.17x:1dsz,42 186.17x.18p:1e26,1p 186.17y:1dt0,42 186.17y.18l:1e27,1 186.181:1dzk,s 
186.18l:1dt1,42 186.18p:1dzb,1,r,1 187:1ebl,1,1,1,tg,1ag0,2o,w,w 187.1cr:1b3 187.17x:1dt2,42 
187.18l:1dt3,7g,7 187.18l.17x:1e29,1 187.18l.18l:1e2b 187.18l.18p:1e2c 187.18p:1dyt,1,r,1 
188:1ebp,1,1,1,1b9u,2o,w,w 188.18l:1dt4,41,3m 189:173,1d4q,1,1,1,1b9f,w,w,w,w,w 189.17w:1dt5,41 
189.17w.18l:1e2d,27 189.18k.18p.33:1e5z 189.18l:1dt6,41 189.18l.18l:1e2e,1 189.18l.18p:1e2g,1q 
189.18p:1dyv,1,r,1 18a:1ebx,1,1,1,1b9n,w,w,w,w,w 18a.17w:1dt7,41 18a.18l:1dt8,41 
18a.18l.18l:1e2h 18a.18l.18p:1e2i,1 18a.18p:1dyx,1,r,1 18h:1bb,1d0q,1,1,1,1b98,w,1s,w,w 
18h.17w:1dt9,41 18h.17x:1dta,41 18h.17y:1dtb,41 18h.17y.18l:1e2k,1 18h.18l:1dtc,41 
18h.18l.18p:1e4h 18h.18p:1dtd,1,22,1 1b5:19r,gc,1,2nvm,1,1s,v 1b5.1cr:1b8,4,1cci,1,1,1 
1b6.1cr:1pg 1ba:1dny,1,1,1 18i:1ec5,1,1,1,1b96,w,w,w,w,w 18i.17x:1dtf,3z 18i.18k.18p:1e5t 
18i.18l:1dtg,3z 18i.18l.17x:1e2m,1i 18i.18l.18l:1e2n 18i.18l.18p:1e42 18i.18p:1dth,1,20,1 
18j:1bd,1,1cdg,1,1,1,nc,1,1,1,1b8u,w,1s 18j.1cr:1bh,52,1ca8,1,1,1 18j.li:1qa 18j.30:1dtj,21 
18j.17w:1dtk,3w 18j.17x:1dtl,3w 18j.17y:1dtm,3w 18j.18k:1dtn,1y,1y,10 18j.18l:1dto,1y,1y,10 
18j.18l.18l:1e4b,8 18j.18l.18p:1e47 18j.18p:1dtp,1,1x,1 1bg:1gi 1bj:1ps,1bz6,1,1,1 1bj.1cr:1bo 
1bl:1dp6,1,1,1 1bn:1dp2,1,1,1 18k:1ecd,1,1,1,1b8r,w,w,1s,w 18k.1cr:1br 18k.li:1bp 18k.30:1ed7,1 
18k.30.191:1ed5,1 18k.30.19w:1ed3,1 18k.33:1dxp 18k.17m:1ed1,1 18k.17w:1dtr,3u 
18k.17w.17w:1e2r,1 18k.17w.18l:1e4a,2 18k.17w.18p:1e3w 18k.17x:1dts,3u 18k.17x.18l:1e2o,1h 
18k.17x.18p:1e2p,1 18k.17y:1dtt,3u 18k.17y.18l:1e2t,1 18k.18l:1dtu,1v,1z,x 18k.18l.17x:1e2v,1 
18k.18l.18p:1e3x 18k.18p:1dtv,1,1u,1 18l:1ech,1,1,1,1b8o,w,1s,w,w 18l.1cr:1pj 18l.30:1dvs 
18l.17w:1dtx,3t 18l.17w.17x:1e30 18l.17w.17y:1e36 18l.17w.18l:1e31 18l.17w.18p:1e4g 
18l.17x:1dty,3t 18l.17x.17w:1e2x 18l.17x.18l:1e2y 18l.17x.18l.17z:1e5w 18l.17x.18p:1e2z 
18l.17y:1dtz,3t 18l.17y.17w:1e32 18l.17y.18l:1e33 18l.17y.18p:1e49 18l.18l:1du0,1t,20 
18l.18l.18p:1e41 18l.18p:1du1,1 18l.1hiy:1dq 18m:1ecl,1,1,1,34u,183r,w,w,w,w,w 18m.179:1go 
18m.li:1gp 18m.33:1dxy,p 18m.17w.17x:1e48,5 18m.17w.18l:1e3b,1 18m.17w.18p:1e3d,1a 
18m.17x:1du4,3r 18m.17x.18l:1e39 18m.17x.18p:1e3a,t 18m.17y:1du5,3r 18m.181:1dvu 18m.182:1dvv 
18m.18l:1du6,1q,21,p 18m.18l.18p:1e3e,1 18m.18m:1dvx 18m.18p:1du7,1,1q,1 1c0:1c2,1cde,1 
18o:1pt,1cn0,1,s6,1ag1,3k,w 18o.1cr:1cb,1cer,1 18o.lv:1c7,1ceo,1 18o.li:1c6,1cer,1 
18o.le:1c9,1cex,1 18o.19s:1c8,1cer,1 18o.19w:17o,2a,1czz,1 18o.lv.19w:19z,1ch2 
18o.183.18k.18l:1e60 1c5:1dr4,1 
18p:18q,10,24,i,6,dn,1bz5,1,f,1,1l,1,j,1,1,1,kw,1,1,1,1,1,1b85,j,1,c,w,k,c,j,d,w 
18p.179:1a1,1u,1cbv,1,1,1,1j,1,1,1 18p.1cr:17v,k,1r,1r,k,3l,1c78,1,1,1,n4,1,1,1,1bay,w,1s,w,w 
18p.1cr.1cy:1pz 18p.li:1ce,3s 18p.179.li:1q8 18p.1cr.li:1q6 18p.li.lj:1q2 18p.le:18d 18p.lm:1ov 
18p.190:1pk 18p.19s:1dul,1f 18p.33:1dy6,j 18p.1cr.33:1dye 18p.19w:17q,2a,1d01,1,1,1 
18p.19w.30:1dre,1 18p.19w.33:1drg,1,4u,1x 18p.19w.1a3:1drq,1,1 18p.19w.17w:1ds0,47 
18p.19w.17x:1ds1,47 18p.19w.17y:1dw9 18p.19w.181:1dus 18p.19w.182:1dut 18p.19w.18l:1ds2,2s,1g,1x 
18p.19w.18m:1duv 18p.19w.18o:1dri,1 18p.19w.18o.lv:1drk,1 18p.19w.18o.li:1drm,1 
18p.19w.18o.19s:1dro,1 18p.19w.18p:1drt,1,1,8,1,2s,1 18p.17w:1dud,3p 18p.1cr.17w:1dsh 
18p.17w.18p:1e3z 18p.17x:1due,3p 18p.17x.18p:1e3y 18p.17y:1duf,3p 18p.181:1dw1 18p.1cr.181:1dva 
18p.182:1dw2 18p.1cr.182:1dvb 18p.18l:1dug,1n,22,j 18p.1cr.18l:1dsi,2u,1a,1r 18p.18l.18l:1e3g,1 
18p.18l.18p:1e40 18p.18m:1dw4 18p.1cr.18m:1dvd 18p.18p:1duh,1,1n,1 18p.1cr.18p:1dsj,1,2u,1 
1cj:1dps,1 8xs:1f3s 8xu:6e6,1tn,x0,2ab6 8yf:6e5,i9,17aj 3k6:11g 3mp:11o 3ou:117 3s3:11m 
1s5.li:1v6 1s5.1tq:1s6 1s5.1tq.li:1sh 1s5.1tq.1tm:1v8 1s5.1tq.1ty:1si 1s5.1tq.1u0:1sk 
1s5.1tq.1jz8:1sj 1s5.1tm:1v7 1s5.1u7:1v9 1s5.1ty:1s4 1s9:204 1sf.li:1sd 1sf.1ty:1se 1sf.1jz8:1sg 
1sv:1zz 1sw:200 1sy:20b 1t0.1u5.1t0:1zw 1t6:207 1t6.1u5.1sv:22a 1t6.1u5.1sv.1xb:1zb 
1t6.1u5.1sv.20w:1zc 1t6.1u5.1sv.1jz8:1zj 1t9:20e 1ta:20o 1tc.1u5.1s7:1s8 1th:1zp 1tl:20l 1tp:24d 
xdn:1i3g 1tq.li:1u1 1tq.1tm:1tn 1tm:1i2z,1w5 1tt:24h 1tu:24i 1ty:217 1u0:214 1u5:219,3k 
1vp.1xa:1vq 1vv.1xf:1y8,1 1w8:1imq 1wa:1ims 1wc:1imu 1we:1imw 1wf:1imx 1wh:1imz 1wj:1ine 
1wk:1in2 1wl:1in3 1wm:1in4 1wn:1in5 1wo:1in6 1wq:1in7 1ws:1ind 1wu:1inb 1wv:1inc 1ww:1yo,1gor 
1wy:1in1 1x3:1inh 1x4:1ini 1x9:1io4 1xa:1ink 1xb:1tr,74,1gmq 1xj:1int 1xn:1inw 1xo:1iny 1xp:1io2 
1xz:1inx 22b.1jz6:1zd 22b.1jz7:1ze 1z9.1u0:1zk 1z9.20u:1za 1z9.218:1zo 22t.24e:22u 
22t.24e.24l:235 22t.24e.24n:237 22t.24e.24o:238 22t.24l:231 22t.24n:233 22t.24o:234 26d.27y:26e 
287:375 29x:2cu 2a0:2b4,e 2a0.2bl:2cr 2a1:2co,81 2a1.2b7:2a2 2a1.2mv:2kq 2a6:2ct 2a6.2b9:2d3 
2a8:2ak,ao 2aa.2b7:2ac 2ad:2cn 2ai:2cq 2ai.2bl:2cs 2ai.2bm:2cy 2an.2bj:2m2 2ar:2lf 2ar.2ml:2nu 
2aw.2bk:2d6 2b2:2lh 2b2.2bk:2d0 2b3:2cw 2b9:2l2 2b8:2lw 2b7:2c7 2ax:2bs 2ba:2bc,am 2bb:2d4 
2bj:2m7,1 2bq:2me 2bq.2a0:2bu 2bq.2b7:2bw 2bq.2bq:2mg 2bq.2ku:2kw 2br:2mf 2br.2a0:2bv 2dh:2h1 
2di:2h2 2dj:2h3 2dn.2f2:2g0 2do.2f2:2g1 2ds:2hc 2du:2he 2du.2fg:2dw,3k 2du.2fp:2dv,3k 2dz:2hj 
2e4:2ho 2e5:2hp 2e6:2hq 2e7:2hr 2e9.mb:2ea 2eb:2hv 2ee:2hy 2ef.14s:2ed 2eg:2i0 2ek.mb:2el 
2en:2i7 2eo:2i8 2eo.14s:2e8 2ep:2i9 2eq:2ia 2et.mb:2ev 2et.2f2:2ex 2et.2f5:2em 2er:2ib 2f3:2in 
2f5:2ip 2f5.2f2:2f6 2f7:2ir 2f7.2f2:2f8 2h8.2im:2jl 2hi.mb:2dy 2kn.2mv:2ko 2ky.2m6:2kz 
2ky.2mv:2l0 2la:2n5 2li.2ml.2ls:2nf 2lk.2m9:2ks,d,2o 2lk.2ml:2nj,c 2lk.2ml.2lk:2ng 
2lk.2ml.2lq:2my 2ls:2lt,k1,5y 2ls.2ml:2ne,i 2ls.37i:39d 2ls.370:35s 2ls.370.37d.2ls.370:36r 
2lu.2ml:2nx 2lx.2ml.2ls:2ni 2m1.2ml.2lq:2nq 2lv.2ml:2ny 2m9:2ma,1 2oh:2ph 2oh.2qh:2oj 
2oh.2q2:2oi 2ok:2pl 2or:2pi 2ow:2ps 2oy:2qy 2pb:2qz 2pj:2pw 2pv.2qg:2od 1ik4.1iki.1ij6:1ij7 
1ik4.1iki.1ijc:1ijd 1ik4.1iki.1ijn:1ijo 1ik4.1iki.1ijt:1iju 1ik4.1iki.1ijw:1ijx 
1ik4.1iki.1ijy:1ijz 1ite:1ivs,1 1itf:1ivu 1itg:1ivv 1iuq:1ivw 1iur:1ivx 2rm:2rn 2ro:2s4,1 
2rq:2sh 2rs:2vc 2ru:2rv 2ry:2rz 2s1:2s7 2sa:2vu 2sb:2vv 2sd:2vx 2se:2vy 2sf:2vz 2sg:2sm 2si:2vh 
2sv:4pg 2sy:2th lm.2sy:2sz 2t0:4on 2t1:4oo 2t2:4op 2t3:4oq 2t4:2wo 2t5:2wp 2tc.2tc:2td 
2wb.2vt:2xo 2wb.2w1:2xp lm.2wi:2wj 31c.31w.32a.327:2yq 31c.31w.32a.2z8:2yr 31e:31m 
31k.324.326:2yo 33m.31t.328:31z 33n.31t.328:321 322.322:323 324.324:325 1k8a:1k8i 4k5:4l0 
35v.37i:38w 36d.37i:38m 36d.370:36n 36d.370.37i:38v 399.37i:39a 36j.37i:38h 36m.37g:36x 
36m.37g.287.370.37e:36y 39f.lm:3a6 4ne:4nj 4o2:4o3 526:53k 52p:53l 56t:58g,g xkx:xn7 xlv:xna 
5cd:5ea 5ch:5eb 5d4:5eg xi5:xib 4t8:4uu 4s5:4t1 3xr:6ba 3y9.53:3yl 3y9.3z4:3zf 3yc.53:3yp 
3yd.53:3yr 3yd.3z4:3zh 3ye.53:3yt 3yi.53:3yw 3yi.3z4:3zi 3yj.53:3yy 3z2.4wv:4wt 3z5:441 3zd:474 
3zm.53:3zz 3zo.53:403 3zp:6zt 3zt.53:407 40f.53:40s 40g:6tf,2as 40g.53:40u 40g.13:415 40g.1b:7ux 
40g.40l:8gn 40h.53:40w 40l:6te,2as 40l.53:40y 40l.13:416 40m.53:410 417.53:41h 417.13:41x 
41a.53:41l 41c.53:41p 421:4cj 421.53:42b 423.53:42d 424.53:42f 426.53:42j 428:4ci 428.53:42l 
429.53:42n 42r.53:431 42u.53:435 42v.53:437 42w.53:439 42z.53:43d 43k.53:43u 43m.53:4w7 
43n.53:4w9 43o.53:4wb 43p.53:4wd 43r.53:43w 43s.53:43y 443:4ck 443.53:44d 445.53:44f 446.53:44h 
447.53:44j 448.53:44l 44a:4cn 44a.53:44n 44b.53:44p 44t.53:453 44v.53:455 44w.53:457 44x.53:459 
44y.53:45b 450.53:45d 451.53:45f 45n.1o:45o 45n.2q:45q 45n.40l:45p 45n.428:45r 45s.53:460 
45t.53:462 45u.53:464 45v.53:466 45w.53:468 45x.53:46a 45y.53:46c 46g.53:46q 46h.53:46s 
46i.53:46u 46j.53:46w 46l.53:46y 46m.53:470 477:4de 477.53:4ww 47a:4df 47e:4dg 47g.53:47j 
47k.2q:48z 47k.2q.lj:490 47k.2s:48x 47k.28:48v 47k.417:4fj 47k.418:48u 47k.41a:48w 47k.41c:48y 
47k.41v:491 47u.53:47w 47y.53:4wz 486.53:4x0 487.53:489 48b.53:4x1 492.53:4x4 49h.22:49d 
49h.421:4fk 49h.422:49a 49h.423:49b 49h.424:49c 49h.426:49e 49h.428:49f 49h.429:49g 49i.22:4fn 
49i.423:4fl 49i.424:4fm 49i.426:4fo 49i.428:4fp 49i.429:4fq 49j.53:4x6 49z.53:4fr 4a0.53:4fs 
4a1.53:4ft 4a2.53:4fu 4a3.53:4fv 4a4.53:4fw 4a5.53:4fx 4b6:8ff 4b9:8fe 4bl:wl3 4c4.53:4xc 
4d7.53:4xe 4ee:5vf 4f4:wkt 4wk:5ve 4wm:5ry 4wv.3z2:4ws 4xf:kh 4xg:j7 4xh:ki,4c9,s9i 4hl:wxc 
4ho:4ip 4hp:4hu,2il 4i3:2k3j 4i7:6mp 4i8:6nz 4i8.6o2:86m 4i8.4ii:86b 4j3:8yr 4ii:6ny,1nn 
4ik:6v8,lf,3,48,17hu,4df,17z1 4ik.mq:6ze 4im:6vc,1g5 4iu:1fio 4iw:6mt 1h1e:1h4s 1h2d:1h4q 
3cw:3hk,689 3cw.3cw:3cx,4o,689 3cw.3cy:3ju 3cw.3cz:3fe 3cw.3d1:3ib 3cw.3d3:3jv 3cw.3d5:3hm,689 
3cw.3d5.3cw:3ic 3cw.3da:3jw 3cw.3db:3jx 3cw.3de:3jy 3cy:3hn,689 3cy.3cw:3df,4y 
3cy.3cy:3dg,6j,67a 3cy.3cz:3dh,4x,68w 3cy.3d1:16mj 3cy.3d3:3di 3cy.3d5:3ff,30,68w 
3cy.3d8:3fg,28,689 3cy.3da:16mk 3cy.3dc:3ih 3cy.3de:3fh,28,689 3cy.3eo:3ig,68w 
3cy.3fy.ffs:9cp,d7q 3cz:3hq,689 3cz.3cw:3dj,4z 3cz.3cz:3d0,6d0,wwl 3cz.3cz.3d3:16mm 
3cz.3d1:3fi,31 3cz.3d2:xgg 3cz.3d3:xgh,966 3cz.3d5:xgi,966 3cz.3d5.3cw:16mp 3cz.3d8:xgj,967 
3cz.3da:16mr 3cz.3dc:16ms 3d1:3hr,68a 3d1.3cw:3hs,68a,nqi 3d1.3cw.3cw:xgl,968 
3d1.3cw.3d5:3ik,68t 3d1.3cw.3de:16mu 3d1.3cy:3dk,51 3d1.3cz:3im,68s,np8 3d1.3cz.3cz:xgn 
3d1.3cz.3de:3in 3d1.3d1:3dl,53 3d1.3d1.3db:16mv 3d1.3d2:3ht,68a,nql 3d1.3d2.3cw:3ip 
3d1.3d2.3d5:3iq 3d1.3d2.3de:16mw 3d1.3d3:3hu,68a,nql 3d1.3d3.3cz:16mx 3d1.3d3.3d3:xgq 
3d1.3d3.3d5:3ir,68o 3d1.3d3.3d7:3it,txy 3d1.3d3.3dd:16my 3d1.3d3.3de:3is 3d1.3d5:3hv,68a,nqn 
3d1.3d5.3d5:3iu 3d1.3d7:3dn,139e 3d1.3d8:xgt 3d1.3db:3iw,txy 3d1.3dc:3hw,68a 3d1.3dd:3hx,68a 
3d1.3de:3dm,x,3f,68a,wxe 3d1.3eo:3iv,68l 3d1.3f0:16mz 3d1.3fd:3ix,68k 3d1.3fd.3de:16n0 
3d2:3hz,68a 3d2.3cw:3iy,txx 3d2.3cy:16n2 3d2.3cy.3cy:16n3 3d2.3cz:xgw 3d2.3d1:3iz 3d2.3d2:16n4 
3d2.3d3:3do,5c,68i 3d2.3d3.3d5:16n5 3d2.3d5:3j1,68i,npe 3d2.3d5.3d5:3j2 3d2.3d7:3dp,5h,68f 
3d2.3d8:16n6 3d2.3da:3j4 3d2.3de:3j5 3d2.3eo:3j3,68h 3d2.3fl:ggv 3d3:3i0,68a 3d3.3cw:3dq,6dw 
3d3.3cy:3dr 3d3.3cz:3ds,6dv,wvk 3d3.3d1:3j7 3d3.3d1.3dd:16n8 3d3.3d2:16n9 3d3.3d3:3d4,6d7,wwz 
3d3.3d3.3d7:3e4,6dp 3d3.3d5:3dt,48,68b 3d3.3d5.3cw:3du,6du 3d3.3d5.3cz:3dv,6du,wvm 
3d3.3d5.3d3:3dw 3d3.3d5.3d5:3dx 3d3.3d5.3d8:3dy 3d3.3d5.3dc:xgy 3d3.3d7:3e3,57,68i 
3d3.3d8:3dz,6dr,wvm 3d3.3da:3e0,139d 3d3.3db:xgz 3d3.3dc:3e1,6dq 3d3.3dd:3e2,56 3d3.3de:3j9,txr 
3d5:3i2,68b 3d5.9oc.3cw:fka 3d5.9oc.3d2:glk 3d5.3cw:3e5,56,68j 3d5.3cy:3e6,6dp 
3d5.3cz:3e7,55,68k 3d5.3d1:3e8,55 3d5.3d2:3e9,1395 3d5.3d3:3ea,54,68j 3d5.3d3.3cw:3eb 
3d5.3d3.3d7:16nf 3d5.3d5:3d6,4x,68b 3d5.3d5.9oc:fff 3d5.3d5.3cw:16ng 3d5.3d5.3cz:16nh 
3d5.3d5.3d3:xh1 3d5.3d5.3d5:3ec 3d5.3d7:3ed 3d5.3d8:3ee,6dk,wvl 3d5.3da:3ef,1395 3d5.3db:3eg 
3d5.3dc:3eh,1394 3d5.3dd:3ei 3d5.3eo:16ni 3d7:3i4,68b 3d7.3cw:3ep,4r 3d7.3cw.3cw:3jh 3d7.3cz:3eq 
3d7.3d1:xh2 3d7.3d2:3er 3d7.3d3:3es 3d7.3d5:3et,4s,68h 3d7.3d7:3ev,4n,68i 3d7.3d8:3ew 
3d7.3da:3ex 3d7.3db:3jj 3d7.3dc:3ey 3d7.3dd:3ez 3d7.3de:xh3 3d7.3eo:3eu,4s,68h 3d8:3i5,68b 
3d8.3d3:16nr 3d8.3d3.3d3:16ns 3d8.3d7:3f1 3d8.3d8:3d9,6d8,wxc 3d8.3d8.3de:xh4 3d8.3ft:ff9 
3da:3i6,68c 3da.3db:3f6 3da.3de:3f7 3db:3i7,68c 3dc:3i8,68c 3dc.9oc.3cy.3d8:98x,5y,k40 
3dc.3dc:xh5 3dd:3i9,68c 3dd.3d3:3fa,4d 3dd.3d5:16nu 3dd.3d7:3fb,4d,68g 3dd.3dc:16nv 3dd.3de:xh6 
3de:3ia,68c 3de.3cy:3jp 3de.3d1:3jq 3de.3d2:3jr 3de.3d3:3js 3de.3d5:xh7 3de.3de:3fc,6ct 
3ek.3ek:3el 3em.3em:3en 3eo:3jf,68k 3eo.3d3:16nn 3eo.3d3.3d7:16no 3f0:3jk,68h 3f0.3d2:16np 
3f0.3de:16nq 3f2.3f2:3f3 3f4.3f4:3f5 3fd:3jt,68d 3fd.3fd:xh8 3fk:9r8 3fl:9qn 3fl.9oc:3hf 
3fl.3ft:3g6 3fl.3fy:3g7 3fl.ffs:3fm,6b2 3fn:9qp 3fn.3ft:3g8 3fn.3fx:3g9 3fn.3fy:3hg 
3fn.ffs:3fo,6b2 3fp:9qr 3fp.9oc:3gc 3fp.3ft:3ga 3fp.3fy:3gb 3fp.ffs:3fq,6b2 3fr:9qt 3fr.3fn:3hh 
3fr.3ft:3gd 3fr.3fy:3ge 3fr.ffs:3fs,6b2 3ft:9qv 3ft.3fl:3fu,6b2 3ft.3fl.ffs:3fv,6b2 3ft.3fn:3hi 
3ft.3fn.ffs:3hj 3ft.3fp:3gf 3ft.3fp.ffs:3gg 3ft.3fr:16ls 3ft.3fr.ffs:3gh 3ft.3ft:3gi 
3ft.3ft.ffs:16lt 3ft.3fy:3gj 3ft.ffs:3fw,6b2 3fx:9qz 3fx.3fl:16lu 3fx.3fl.ffs:16lv 
3fx.3fn:3gk,2,6bl 3fx.3fn.ffs:3gl,6bn 3fx.3fp:16lw 3fx.3ft:3gn 3fx.ffs:3go,6bl 3fy:9r0 
3fy.3fl:3gp 3fy.3fl.ffs:3gq 3fy.3fp:3fz,6b2 3fy.3fp.9oc:3gr 3fy.3fp.ffs:3g0,6b2 3fy.3fr:16lx 
3fy.3fr.ffs:3gs 3fy.3fy:3gt 3fy.ffs:3g1,6b2 3fy.ffs.ffs:16ly 3g2:9r4 3g2.3fl:3gu 
3g2.3fl.ffs:16lz 3g2.3fp:3gv 3g2.3fp.ffs:3gw 3g2.3fr:3gx,6bd 3g2.3fr.ffs:3gy,6bd 3g2.3ft:16m0 
3g2.3fy:3gz 3g2.ffs:3h0,6bc 3ha:9sd 3ha.3fl:16md 3ha.3fp:3hb 3ha.3fp.ffs:16me 3ha.3fy:3hc 
3ha.3ha:3he 3ha.ffs:3hd,6b1 9ko:9nc 9j0:6yp,1ab 2dk2:fim vnu:wim vo0:wj0 vr4:wik vua:wiw w2h:wjj 
w4x:wji w5p:wic wbv:wjk wc5:wjm wcf:wje wci:wj4 wgo:wiv wk5:6ud,10d,p9r,1my3 wkk:x3y wko:6kh 
wl2:6ki,18sv,l5h,jjj,m 20hs:6kj 1jvp.1jvz:1jvq 1jvp.1jvp:1jvs 1jvp.1jvp.1jvz:1jvt 
1jvp.1jvp.1jw0:1jvu 1jvp.1jw0:1jvr 1jw3.1jvz:1jw4 1jw3.1jw3:1jw6 1jw3.1jw3.1jvz:1jw7 
1jw3.1jw3.1jw0:1jw8 1jw3.1jw0:1jw5 1jvv.1jvz:1jvw 1jvv.1jvv:1jvx 1jvv.1jvv.1jvz:1jvy 
1f3c:6tx,1gs,om1,1uha 1f3w:7gd,2clz,7ao 1f40:89i 1fei:x3v 1fde:x3u 1fgm:1fhc 1f9e:1fbl 1f9v:1fbn 
1fa2:1kxk 1ggu:7j9,1h3o gg4:9ix ff1:1d9j fgd:464g ffq:1dgw ffs:3g5,3l3,3,3,3,5,4,28j,gy,32 
ffs.9oc:3h8 ffs.3fl:3h4 ffs.3fn:3h5 ffs.3fn.3ft:16m5 ffs.3fn.ffs:16m6 ffs.3fr:16m7 
ffs.3fr.ffs:16m8 ffs.3ft:3h6 ffs.3ft.ffs:16m9 ffs.3fx:16ma ffs.3fy:3h7 ffs.3g2:16mb ffs.3ha:3h9 
ffs.ffs:16mc fg2:1d6t fg8:464h fg9:1d9a fgh:464i fh5:9ac,kc fh6:96r,nw fh7:96q,no fi8:99u 
fia:1d7f fid:9ad,k5 fie:1dbu fik:9ae,cl 2tcy:464j fj4:9af fji:1d9z fju:9ag fjv:96t,f3 fk0:1ddp 
fkc:4655 fl0:1dbc fog:464k fp1:fsy,3qbp fpc:1dgz fpi:1d7x fpn:1dbp fqm:1df4,2sph fqz:464m 
fr3:1d9h ftw:fuk fu3:1dck fwa:464o fx5:464p fyn:464r fyy:1dbv fzb:1df5,2spl ae6:464s 
g1r:9ah,f1,1qz0 g1s:972,1472 g1x:1dh0 g25:1df6,2spo g2c:464v g2s:464w g2t:9ai g2v:4650 g2w:1dgy 
g2x:1da0 g2z:9aj,ck g31:1dch g3b:464x 2u58:464y 2u5h:46cb g3k:1dh1 aex:464z g3m:9ak g3x:4651 
2u6j:4652 g42:46aa g45:46ab aez:46h6 kcg:46ac g46:9al g47:4653 g4k:4654 g4r:9am g4s:4656 
g51:1dgx,2soa g53:1d7y g5l:1da1 g5o:1d91 g64:1d90 g66:1ded g68:9an 2ud6:464t g6t:9ao,2l44,1bqh 
g74:9ap g76:96x g77:465a g7b:1dds,2ssw g7r:1db0 g89:1dct afz:465b g8q:1ddr g8r:465c g92:465d 
gaa:465e gaf:465f gax:1dc7 2upw:46hl gbf:9aq,bd,13of gbn:1db1 ahh:465g gc3:46fm gcn:1dh2,2sof 
gcp:1df7,2sqb gcy:1d8y gda:1d7z gdg:1df8,2sqb gdx:1da7 ge1:9ar ge2:1dh3,2soh ged:465l gee:465m 
2uvy:46hp get:9as gev:1d9f,2sw8 gey:9at gfs:9au gfz:1dd7 gg1:9av,81 gg5:9iy gg9:465o ggd:34m 
ggg:34l ggh:1df9,2l2k,7nw ggq:465q ggs:9aw,c0 gh5:9ax aim:96z ghf:465r ghh:1d7g ghp:465s 
ghr:465t,1,1 ghu:9ay 2v58:465w gja:9az gjn:1d9n gjs:9b0 gju:465y gkf:465z 2vdv:4660 
gkj:9b1,1,cv,7hm gkl:1d6u gkr:4661 gkx:4662 gli:4663 glr:1dcu gm5:1dd9 gmw:4665 gn6:1da8 
gnc:4666 go8:4667 gpq:4664 gpu:4668 gql:1db2 ako:dcr gs6:4669 gsw:466a gur:gv3,3pb8 gut:1dh5 
gv7:466c gw4:466d,1 gw7:1d6z gwp:1dh6,2sp9 gwt:1dfa,1u gx7:466g gxf:466h gxs:1de5 gxu:466i 
gyq:1dh7 gzq:1dfb,2sr9 h1t:466m h2s:466n h2g:1dfc h6h:1dbd h7a:466j h7b:466l h7j:9b3,1,897 
haj:466t hce:466q app:beb hdg:466r he5:466s hf5:466v hf6:466u hfk:1dfd hga:1de8,30 hge:1d9o 
hgh:hgr hij:hkv hik:466w hir:1dh9 hjs:1d8q hjz:1d8i 2x9g:466x hke:466p hki:466y hkn:2xbn,18vc 
hky:9b5 hl2:4670 hl6:9b6 hlh:9b7,bg hlm:2xdz,18t2 hlu:4672 hlz:9b8 hms:1dha hmw:1d70 hn8:1dhb 
hn5:1d6x hnm:4673 ho3:9b9,13z0 2xm0:2xlz,18l5 2xnu:4675 hqw:4679 hrg:4676 hsr:4677 ht3:4678 
huq:1dhc huu:467a hwv:hz4 aum:467b av0:467c hx1:46fa hzc:467d i08:1dhd i0u:467e,1 i1c:9ba 
i2o:9bb i2t:1ddw 2y88:467g i4j:467h i54:467i i5j:1d9b,23,2sw5 i5q:1dbw i5v:467k 2yhk:467l 
i60:9bc i67:467m i6e:467n i6n:9bd i76:974,4a,3wwb i77:973 ayp:467q i7s:9bf i7z:1dbx i8w:467r 
i8y:1d8r i90:1dff i91:1dcv i9a:9bg,1440,2ssc 2yvf:46bc i9d:9bh ibk:3tbu,cvz ia5:467u 2z1g:467v 
2z1i:467x ie1:1dcl if7:467w ifk:1d7l igb:467z ige:467y igs:4680 iia:46ic iii:1dbf ijf:9bi 
ijm:4682 ijp:9bj,ah ik1:9bk ik3:976 b3j:4683 ikd:4684 ike:9bl ild:ilu ilk:4685 im5:4686 ind:4687 
b4y:4688 2zr7:4689 inm:9bm ino:1dam 2zrz:46d5 inu:977,4g inz:9bo ip2:1ddt b5o:468a ipc:468b 
ipf:468c ipi:468d iq2:1d7s,2t0m iq1:1db6 iqa:1dhe iqb:1de3 iqh:1dhf ir0:1daa ir8:9bp 
iri:9bq,3wwq 3035:468h,1 iro:1d8j irv:9br is3:9bs isi:468k,1 its:9bt itt:978 itv:467o b7r:468m 
iu9:9bu iua:468p iuh:1dhg iuj:468q iur:9bv ivf:1dco b8j:468r ivu:30g5,15sn iw9:1d9i iwd:1dhh 
iwz:9bw ix0:97a b96:97b ix9:468t ixj:468u iyd:1db7 iyh:468v iz6:1d9c izg:1dbg j1x:1dgr ba4:468y 
bay:468x j29:468w j2s:1dfh,2sti j47:4691 j4o:1dhi j4x:1dbt 30t0:4690 j60:1dhk j8o:1dfi j7o:1dcp 
j7s:4692 j7w:4693,2 j7y:1dhj,2srl j8g:1dhm j96:4696 j9q:1dfj,22,2srm j9s:1dan jac:4699 jan:469a 
jaq:4698 3138:1djk 313e:1djj jby:469b jci:1dfk,23,2srp jcm:1d71,2t2c jcw:1dao jd4:9bx jdc:469e 
jdn:469f je6:1dci jec:1dho jee:9by,a2i jez:9bz jf0:97c jfh:469g jht:469h jih:1d7p jin:1d97 
jir:1ddu jis:469i jjw:469m jjy:1d9v 31n0:469k jlp:469l jm8:469j jmw:469n jnf:1db8 jnn:469o 
jog:1d9x jop:469t jpg:1dhp jqc:469p jrw:1dhq 31td:469q js2:469r jph:469s jte:1dhr ju1:469v 
juf:469y jum:469w bhq:469u bi9:jrd jve:1dap jvh:469x jwk:1d80 bjg:469z jzj:9c0 jzo:9c1 jzp:97d 
k0f:1dfl,2suf k0m:1dhs k18:46a1 k1k:1d9l 32mi:46a2 k1z:9c2 k21:99n k2f:9c3 k2h:1dby k2s:9c4 
k3d:9c5 k3p:1dab k4g:9c6 k4h:97f k4i:1dfm k4j:46a3 k4l:9c7 k5v:1dcw bmi:kc6 bms:46a9 k7d:46a5 
k7u:k89 k8k:1dea,3j k9d:1dfn,2suk k94:1dc5 bns:46a8 k9o:46ad kac:1ddy kau:1daj bo9:46a6 
335k:468n kc0:9c8 kc4:1d6p kc8:46a4 kco:9c9 33a7:3tby,d36 kcs:peu kcv:pg0 kcw:pfu kcz:phd 
bp1:ph2 kd3:1d7t,a1,2ssm kd4:pif kd7:1dhv,2ssm bp6:imo bp7:dgg 33bn:46fd kdf:plz 33bw:46fe 
kdk:9ca kem:1dcx ker:46ak keu:1dhw kf2:46aj 33cz:46al kfi:kjj kfv:1dc8 kg5:46ao kgn:1ddg 
bpl:46am 33dh:1djl kj7:1dc9 kje:46an kk7:1dcq kkf:46at klu:46ap 33hp:46ar kn5:1da2 kn9:1dfo,2sv2 
kni:46as ko8:1dcy kr8:46au ksi:46aw brx:1djm,2sr9 bs3:kx5 kv1:kyv kv7:46ax kx6:46ay 
kxu:1d78,20,2r kyb:1d8s 33xf:46b0 l2g:46az l3n:1d81 l3v:46b1 l50:1d7h bvc:46b2 l5s:9cb l5t:46b3 
34br:46b4 l78:46b5 bwu:46b6 l7m:9cc l7z:99p l82:46b7 l87:1dak l89:9cd,145k l8a:97i l9b:46b8 
l9q:1db9 l9v:9ce la2:1d9s,86,2stb la3:46ba 34p9:46bb laj:9cf lal:97j 34sa:46bd las:9cg laz:9ch 
lcf:9ci lch:97k lck:9cj ldg:9ck ldh:97l ldm:97m le6:46be lev:46bi lfs:1d9u lhb:46bg lho:1d9k 
lhp:46bh lid:1dcz 354s:46bf ljv:1d79 ljy:1ddx lkk:46br lku:46bk lkx:1dca,5p,2stn ljq:46bj 
lm1:46bn lm2:1d7u lmf:1dfp,2svw lmg:46bo lmt:358g,1139 357i:46bq lor:1ddh lp6:1d8t lpm:1dcm 
lq1:46by lqy:1dfq lrj:46bs lta:46bt lu0:lzt lvv:1di1,2stu luk:1dcb lve:1dd8 lvr:46bw lw1:1d6s 
lwb:1di0 c37:46bu lxr:1d8u lya:1dfr,2b lyb:1daq 35jl:46bx m0e:46bz 35ni:46c0 35ou:46c1 m2u:46c2 
m3v:1d7m m4e:1dac m57:46c5 m5a:1di3,2su1 m61:46c3 m6i:46c7 c5y:46c6 m7f:9cl m7g:97n m7k:465x 
m7r:46c9 m7x:46c8 m8p:1ddn m99:46ca ma0:1db3 mah:1d7a mem:1dfs,2c 368z:46cd mdh:46cc mdl:1dar 
36cu:1dgs mfw:46ce mha:1dc0 mhc:1dda 36i3:46cf mj4:1d82 mjf:1d7i mjs:46cg mju:9cm mjv:97o,1485 
mk5:1di6,2sub mk6:9cn mkb:9co ffw:97q mkn:9cq mkw:46ci ml5:9cr 36yw:46cj ml7:9cs mle:1d8m 
mm8:46ck mmt:46cl mng:9ct mnh:97s mnj:1di7 mo0:1ddm 3779:46cm mpo:1d7v mqy:1dee,3u 37dg:3rnp,eoy 
mt1:1dbb mt6:46co mtg:9cu mtj:1d9d,3e mtl:9cv mtn:46cp cdo:46cq mud:37jx,ysu muq:1dbh ce0:46cs,1 
mvy:1d7b mx5:1dcc mx2:1dd0 mxu:1dfu myv:46cu mzg:46cv mzt:1dbi n01:1di9,2sun n0l:46cx n0p:1das 
n14:1ddb n2i:46cy n30:9cw n3a:9cx cgr:46cz n46:1dia n4o:9cy n4v:9cz n50:46d0 n54:9d0 n5c:9d1 
n5n:1dib n5q:46d2 386u:46d1 n6h:1dcd n6t:1d9y n74:1d9e,2t3q 389e:46d3 n7v:9d2 n82:9d3 naa:1dd1 
nbk:46d6 nbz:1did nbx:1dic ncy:1dc1 ne1:1d72 nee:9d4 nel:9d5 38v5:46d7 38vs:46d8 nfy:9d6 ngf:9d7 
38zo:46d9 cn0:46da ngq:1def,3z nh7:1dif nhj:1d83 cnc:46db nhq:9d8 nhw:1dig,2suw 394i:46de 
394j:46dd ni9:1d9p cns:1djn 395l:395m,x7t nj2:46dh nj3:46di,1 396b:46dg nk0:1dii nka:1dih,2sv3 
cop:vk3,hzl,2stx cov:k83 cp2:46dn nm3:46dm 39e1:1djp nmv:1di5 nob:9d9 noi:9da noz:9db cra:46do 
39r1:46dp npw:nrj nri:46dq nsb:1dce nt8:1d8b,2t5g ntd:1dfv nuy:1d8n nv0:1dij,2sv9 nwb:1d9g 
ctf:46dt nxm:1dad ny2:9dc ny3:97x ny4:1deg ny6:1dfw nyg:1dfy nyh:1dfx 3a5i:46du nyo:1dfz 
nyu:1dg0,2sxv nz1:1dg1 nz2:1deh nz9:1dei r6e:1dgh,2f nzz:1d8c 3a8q:46dw o0d:1dg2 o0e:1dg3 
o0f:1dej,2szf 3a9x:46dx o1a:1dbq o1k:9dd o1q:9de o22:1dat cvj:46e0 o2z:46dz o4c:1d92 o5m:46e2 
o5c:1dg4,2sxx o5r:46e3 o6s:9df o75:1dg5 3at8:46e4 o8h:1dik o97:9dg,1403 o9o:99r 3b1j:46e5,1 
oa6:46e7 oah:9dh obk:1ddk og0:1dg6,2f d1e:46e8 3b8r:46e9 og6:46ea d2f:46ec og9:46eb 3beo:46ed 
3bgw:1djq oji:1dba okg:1d8k okz:9di ol7:1dim olu:1ddl on2:1del onm:46ee onq:1ddv oo8:46eg 
d5s:46ef oo3:46eh oo7:1da3 ooo:9dj oop:97z 3c06:46ej oow:46ei opc:1dcf opu:1d9m oq7:1d8v or9:os6 
orn:46ek orf:1din otc:1d8d ou6:1d93 ouf:46em,7bi ovo:1dau,5d,2h ow2:46en d8h:46el ow9:1dg8 
oxj:1d8w oxt:1dg9 oxx:46eo 3cgq:468o d9w:46ep p4m:9dk 3ciw:46eq p4u:1dip 3cjr:46er p5d:9dl 
p5e:97v,7 p5f:981 dax:46es p6a:1dga 3cnt:46et p6h:1dd2 p6i:46eu p6t:1d73 3cqm:46ev p6y:9dm 
p79:46ew p7e:1dbj p8d:9dn,140z pa2:46ex pa9:9do,13ug paa:989 pad:1dgb,2f,2sw8 pak:9dp 3d22:46ez 
paq:9dq 3d43:46f0 pbn:9dr pc6:1dbk pcw:46f1 3d7s:3d7h,t7l pdb:1dav pdc:46f3 pdq:1d8l pdr:9ds 
pds:98a pe1:9dt pe3:1d8z pf1:46ae pf6:46f6 ded:46f5 deh:46af ph8:pj5 phf:46f7 pj2:46f9 dfv:46f8 
kdd:46ai 3dlz:46fb 3dmd:46fc dhf:kdi pnc:1d7q pnn:9du pns:1ddi pnu:9dv pnx:1dgc po3:9dw poc:9dx 
poh:468j,6w pok:46fg pos:9dy pp4:1dgt pp7:9dz ppb:9e0 dij:46fi pri:9e1 prj:1da4 prm:9e2 prs:9e3 
prt:98e,1,1,147x,1 psb:46fk psh:46fj pst:46fl ptd:46fn ptf:46fo ptp:46fp put:1d9w,2t5w puu:46fq 
3ebg:46fr px2:1ddq pxu:1dir pyb:46fu pwd:46ft pwj:46fw q0t:46fx pxv:46g0 q15:1d8e q16:46g1 
q18:46g2 q1o:46g3 q1z:46fy q27:1dis q29:1d94 q53:1dgf,2szk 3eie:3eo6,rry q0d:46fv q4d:1d7c 
q4p:1d9q q6l:qbj 3emt:46g6 3eqz:46g5 q9a:1dax q9d:46g8 q9f:46g9 q9o:1dc2 qae:46ga dnv:46g7 
qck:46gc 3f3g:46gd qfh:1d7n dp9:46ge 3f75:46gg dpd:46gf qgq:1ddc qh2:1d85 dpn:46gi qhe:1deo 
qi5:1d7j 3ff6:46gh qif:qip qin:1d74 qj1:9e4 qj2:98h qj4:46gj qjg:1d86,2t8e qjr:46gl qjt:46gm 
qjv:9e5 qll:46gn qko:46go qn6:46gq qoe:46gp qp4:46gs qqz:46gt qu9:46gw qrd:1dit,2sxy qrq:46gu 
dsn:46gv 3g0a:46gb qt6:1d75 qv5:46gx dtl:46gy qvz:1d7r qww:9e6 qx8:9e7,13zt qxs:46gz 
qxv:9e8,3x2s qxw:98i r0i:1db4 3giv:46h1 r0v:1dd3 r13:46h2 r1a:46h3 r1d:1dd4 r20:1d76 r22:46h5 
dv9:46h4 r2o:1dgg r41:1diu r50:1d7o r5q:9e9 r5r:98k r5s:98j r5y:1div r63:9ea,13zs r7l:98l 
3gz2:dxx,3sja r82:9eb r9c:9ec rkw:98o 3h46:46h8 ram:rct dyu:ra6 dz2:46h9 dzb:46ha rds:46hb 
re2:1d9r,1e ren:1dix rez:1diz rf6:1da5 rfa:1d8h rfx:1dj2,2sya rg8:1deq,48 rge:1d99,9s 
rgh:1dgi,2i ri1:1dgj,2k riw:1ddo rk0:1d96 rk6:rkf rka:1dj4,2sy9 rp3:9ed rpi:9ee rpk:1d6o 
rpx:9ef,3x2z rq4:rqb rqw:9eg 3hrc:46hf rrx:9eh rvh:98p rsb:46hg rsx:46hh rsy:1d8o rt4:1d6r 
rtf:1dgk ruw:1dgl,2k rvf:3b2s,veq rxg:9ei rxs:9ej rxz:46hj ry7:rye 3i6r:1djr 3i9b:46hk rzn:9ek 
s0b:46hm rzw:46hn s11:s1m s1b:1d87 s1c:46ho s5z:s63 s6j:9el s7e:9em,13s4 sbq:98r s7o:46hq 
s8v:s9z s9y:1daw sa2:1dcn sag:1dj6,2syl saj:1ddz sbm:1dal sd7:9en sda:46fh sds:9eo,13v5 sdx:9ep 
sdy:98s,1,147t ijl:4681 sgz:1day shk:1det,1u sj6:1dj7 sjg:1dc3 3jki:46hs 3jl9:46ht sjz:1d77 
sk1:9eq sk4:46hu slq:sm6,klq,76 smp:46hv sn1:1deu 3ju6:46hx snl:46hw snv:46hy sp5:9er sq2:1d7d 
srd:1dj8 ss4:1dbr ssm:9es sss:9et,13yc ssv:1da6 ssx:9eu,13s4 tc5:98w svo:1dbl svs:46hz sxi:1dj9 
t07:46i0 t08:46i1 sxo:46i2 t1g:1d8f t3e:1daz t65:t66 t89:46i3 t91:46i4 3ksa:46i5 tiw:98y tj3:98z 
tj4:9ew tm0:990 tjf:46i6 ej9:46i7 tkd:1dae tkn:46i8 3l2v:46i9 tng:9ex tnh:98v,7 tny:1dc6 
tor:1d8x tot:1de1 tpx:1d95 tq0:1dcj tq4:1dja tqe:1dcs tr7:1ddd eli:46ia trq:9ey trr:trs,jk0,3b 
trt:9ez ts3:46ib tsy:1dd6 tsz:1dgo,2n tt4:9f0 tti:1dbm ttj:1d8p tur:46id 3ltx:46ie tv6:1d88 
tvs:1dbn tw1:9f1 tw2:994 tw6:1dek,4s 3ly7:4658 twe:9f2 twi:9f3 3lzu:46if twp:9f4 epa:46ig 
epi:46ih tzf:9f5 u06:995 tzv:1djd u00:46ii u0d:9f6 3mdm:46ij u0j:9f7 u0v:1dgp,2p u0x:9f8 u45:996 
er6:46ik u17:1djf,2sz7,1 u1k:1dbo u21:46io 3mhi:46il u2j:1dgq,2q u3i:1dcg u5k:9f9 u6m:997 
3mpi:46ip u6z:9fa u72:998 u73:999,62 u74:99b uar:99c u76:46iq u7j:1dey u7w:1dez eur:46ir 
u94:1df0 u95:46is uc6:9fc uc9:9fd ucn:46it ucs:9fe ui4:99e ude:46iu uep:1d7e uf2:46iv ui2:1daf 
ujs:9ff ez2:46iw ul4:9fg ulb:9fh 3nsg:46ix umq:1djh,2szh un9:9fi unj:9fj unm:9fk unw:99g,65 
uoq:9fm uws:99h upb:1d89 uv4:46iz uvr:1dde uzp:9fn v0d:46j0 f66:46j1 v9e:v9f v3b:46j3 f71:46j2 
3owe:46j4 v5g:1df1 3oxx:46j6 f7c:46j5 v7e:1d8a 3p5a:46j7 v8e:1d7k vat:9fo vb3:9fp,13sr 3p8x:46j8 
vbr:1dag vbz:1ddf vc5:9fq vc6:99k vcr:9fr,3x3i 3pg2:468f vcz:9fs vd0:99l vd9:9ft vda:1dah 
f9y:46ja vdd:9fu,lxk hig:1dfe veh:9fv,3x3g vel:9fw vem:46jc vet:46jd vf2:9fx vf3:46je vf7:9fy 
vfa:46jf vfk:9fz vgb:9g0,3x3g vgj:1djs vgq:9g1 vgw:99o vgy:9g2 vi7:99q 3pxc:46jh vil:9g3,13w1 
vix:99s vim:1djt vj0:9g4,13qr,1,cm vj3:99v vj4:9g5 2fw:2jg 5ay:5wo 5az:92m 5b9:5bb 5bd:m2 
x5a:id,wmy 1hiy:nc 1jz6:1ue,6j 1jz7:1uf,6j 1jz8:1tz,74 20oj:g2a 2j22:2qrx 2j24:2qtf 2jei:2qnr 
2jej:2qqq 2jek:2qlv 2jel:2qmm,1 2jem:2qmq 2jen:2qmr 2jfk:83j 2jg0:88l 2rps:6o4 2rpt:6oc 2s0l:7kn 
2s0n:7kt 2sca:2qz8 3tbz:j7c
`

/**
 * Characters taken for another ASCII character than their prototype, in the layout above with one
 * ASCII code point per group. The table folds I, 1 and | into l, 0 into O and m into rn, so an
 * uppercase letter with prototype l is taken for I, a digit for 1 or 0 and a symbol for |, and a
 * fullwidth or styled form (`<wide>` and `<font>` in `UnicodeData.txt`) for the ASCII it restyles.
 */
const lookalikeGroups = `
21:ba,eb,31,56,5lc,1,29t,15lj,m0x,ilw,1ey,1g,1g,2w,2w,1g,1g,1g,1g,1g,1g,1k,1m,1m,1m,1m 
3g:14w,5lv,d6,17bz,3w 1d:19d,40,1d0g,634,ykw,25a,a,a,a,a,73u 
1c:1j4,10m,1bu2,53k,zk,ykw,25a,a,a,a,a,73u w:9hc 17:1dm1,rm y:1ede z:1edf 10:1edg 11:1edh 
12:1edi 14:1edk 15:1edl 16:1edm 18:1edo 19:1edp 1a:1edq 1b:1edr 1e:1edu 1f:1edv 1g:1edw 1h:1edx 
1i:1edy 1j:1edz 1k:1ee0 1l:1ee1 1n:1ee3 1o:1ee4 1p:1ee5 1q:1ee6 1r:1ee7 1s:1ee8 1w:1eec 1y:1eee 
1z:1eef 24:1eek 29:1eep 2a:1eeq 2d:1eet 2e:1eeu 2f:1eev 2j:1eez 2l:1ef1 2m:1ef2 2n:1ef3 2o:1ef4 
2q:1ef6 2s:1ef8 2u:1efa 2z:1eff 31:1efh,161l,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g,1g 32:1efi 35:1efl 
36:1efm 38:1efo 39:1efp 3b:1efr 3e:1efu 3f:1efv 3h:1efx 3i:1efy
`

/**
 * `UnicodeData.txt` 17.0.0 names of the characters with an ASCII lookalike and of the ones that
 * show nothing: default ignorables, format and control characters, spaces. Each entry is the gap
 * from the code point before in base 36, a colon, how many leading characters it shares with the
 * name before as one base 36 digit, then the rest of the name. Controls go by their 1.0 names.
 * Variation selectors are left out; their names count up.
 */
const nameEntries = `
0:0NULL|1:0START OF HEADING|1:9TEXT|1:0END OF TEXT|1:8RANSMISSION|1:2QUIRY|1:0ACKNOWLEDGE|
1:0BELL|1:1ACKSPACE|1:0CHARACTER TABULATION|1:0LINE FEED (LF)|1:5TABULATION|1:0FORM FEED (FF)|
1:0CARRIAGE RETURN (CR)|1:0SHIFT OUT|1:6IN|1:0DATA LINK ESCAPE|1:1EVICE CONTROL ONE|1:fTWO|
1:gHREE|1:fFOUR|1:0NEGATIVE ACKNOWLEDGE|1:0SYNCHRONOUS IDLE|1:0END OF TRANSMISSION BLOCK|
1:0CANCEL|1:0END OF MEDIUM|1:0SUBSTITUTE|1:0ESCAPE|1:0INFORMATION SEPARATOR FOUR|1:mTHREE|1:nWO|
1:mONE|2o:0DELETE|3:0BREAK PERMITTED HERE|1:0NO BREAK HERE|2:1EXT LINE (NEL)|
1:0START OF SELECTED AREA|1:0END OF SELECTED AREA|1:0CHARACTER TABULATION SET|
1:lWITH JUSTIFICATION|1:0LINE TABULATION SET|1:0PARTIAL LINE FORWARD|1:dBACKWARD|
1:0REVERSE LINE FEED|1:0SINGLE SHIFT TWO|1:eHREE|1:0DEVICE CONTROL STRING|1:0PRIVATE USE ONE|
1:cTWO|1:0SET TRANSMIT STATE|1:0CANCEL CHARACTER|1:0MESSAGE WAITING|1:0START OF GUARDED AREA|
1:0END OF GUARDED AREA|1:0START OF STRING|2:1INGLE CHARACTER INTRODUCER|
1:0CONTROL SEQUENCE INTRODUCER|1:0STRING TERMINATOR|1:0OPERATING SYSTEM COMMAND|
1:0PRIVACY MESSAGE|1:0APPLICATION PROGRAM COMMAND|1:0NO-BREAK SPACE|d:0SOFT HYPHEN|
7:0ACUTE ACCENT|4:0CEDILLA|e:0LATIN CAPITAL LETTER AE|h:0MULTIPLICATION SIGN|
f:0LATIN SMALL LETTER AE|o:jTHORN|1f:jDOTLESS I|1:6CAPITAL LIGATURE IJ|1:6SMALL LIGATURE IJ|
m:dETTER N PRECEDED BY APOSTROPHE|9:6CAPITAL LIGATURE OE|1:6SMALL LIGATURE OE|18:dETTER LONG S|
2:6CAPITAL LETTER B WITH HOOK|3:lTONE SIX|3:lC WITH HOOK|3:lD WITH HOOK|
3:6SMALL LETTER TURNED DELTA|5:jF WITH HOOK|1:6CAPITAL LETTER G WITH HOOK|3:lIOTA|2:lK WITH HOOK|
8:lO WITH HORN|1:6SMALL LETTER O WITH HORN|3:6CAPITAL LETTER P WITH HOOK|2:6LETTER YR|
1:6CAPITAL LETTER TONE TWO|5:m WITH HOOK|7:lY WITH HOOK|4:lEZH|5:lTONE FIVE|
1:6SMALL LETTER TONE FIVE|2:6LETTER WYNN|1:dDENTAL CLICK|1:dLATERAL CLICK|2:dRETROFLEX CLICK|
4:6CAPITAL LETTER LJ|1:m WITH SMALL LETTER J|1:6SMALL LETTER LJ|1:6CAPITAL LETTER NJ|
1:m WITH SMALL LETTER J|1:6SMALL LETTER NJ|11:6CAPITAL LETTER DZ|1:m WITH SMALL LETTER Z|
1:6SMALL LETTER DZ|15:6CAPITAL LETTER YOGH|6:lOU|1:6SMALL LETTER OU|
u:6CAPITAL LETTER GLOTTAL STOP|g:6SMALL LETTER ALPHA|g:jSCRIPT G|2:jGAMMA|6:jIOTA|
1:6LETTER SMALL CAPITAL I|5:6SMALL LETTER TURNED M|s:jV WITH HOOK|4:6LETTER SMALL CAPITAL Y|
5:dGLOTTAL STOP|f:6SMALL LETTER DZ DIGRAPH|3:jTS DIGRAPH|4:jLS DIGRAPH|1:kZ DIGRAPH|
e:0MODIFIER LETTER PRIME|1:gDOUBLE PRIME|1:gTURNED COMMA|1:gAPOSTROPHE|1:gREVERSED COMMA|
1:hIGHT HALF RING|4:gLEFT ARROWHEAD|1:gRIGHT ARROWHEAD|1:gUP ARROWHEAD|2:gCIRCUMFLEX ACCENT|
2:gVERTICAL LINE|2:gACUTE ACCENT|1:gGRAVE ACCENT|5:gTRIANGULAR COLON|7:gMINUS SIGN|4:0OGONEK|
1:0SMALL TILDE|1:0DOUBLE ACUTE ACCENT|h:0MODIFIER LETTER DOUBLE APOSTROPHE|
6:gMIDDLE GRAVE ACCENT|2:nDOUBLE ACUTE ACCENT|2:gRAISED COLON|2f:0COMBINING GRAPHEME JOINER|
11:0GREEK NUMERAL SIGN|6:6YPOGEGRAMMENI|4:6QUESTION MARK|1:6CAPITAL LETTER YOT|5:6TONOS|
d:6CAPITAL LETTER ALPHA|1:lBETA|3:lEPSILON|1:lZETA|1:lETA|2:lIOTA|1:lKAPPA|2:lMU|1:lNU|
2:lOMICRON|2:lRHO|3:lTAU|1:lUPSILON|2:lCHI|a:6SMALL LETTER ALPHA|2:jGAMMA|6:jIOTA|4:jNU|
2:jOMICRON|2:jRHO|2:jSIGMA|2:jUPSILON|d:6UPSILON WITH HOOK SYMBOL|a:6LETTER DIGAMMA|
c:0COPTIC CAPITAL LETTER HORI|4:mSHIMA|1:7SMALL LETTER SHIMA|4:0GREEK RHO SYMBOL|
1:6LUNATE SIGMA SYMBOL|1:7ETTER YOT|5:6SMALL LETTER SHO|1:6CAPITAL LUNATE SIGMA SYMBOL|
1:fETTER SAN|b:0CYRILLIC CAPITAL LETTER DZE|1:oBYELORUSSIAN-UKRAINIAN I|2:oJE|8:oA|2:oVE|3:oIE|
2:oZE|3:oKA|2:oEM|1:pN|1:oO|2:oER|1:pS|1:oTE|1:oU|2:oHA|6:oYERU|1:oSOFT SIGN|2:oYU|
2:9SMALL LETTER A|1:mBE|2:mGHE|2:mIE|9:mO|2:mER|1:nS|2:mU|2:mHA|3:mSHA|d:mDZE|
1:mBYELORUSSIAN-UKRAINIAN I|2:mJE|9:mOMEGA|j:9CAPITAL LETTER IZHITSA|1:9SMALL LETTER IZHITSA|
s:mGHE WITH UPTURN|t:9CAPITAL LETTER STRAIGHT U|1:9SMALL LETTER STRAIGHT U|c:nHHA|
2:mABKHASIAN CHE|3:9LETTER PALOCHKA|f:9SMALL LETTER PALOCHKA|5:9CAPITAL LIGATURE A IE|
1:9SMALL LIGATURE A IE|b:9CAPITAL LETTER ABKHASIAN DZE|x:9SMALL LETTER KOMI DE|
b:9CAPITAL LETTER KOMI SJE|f:9SMALL LETTER QA|1:9CAPITAL LETTER WE|1:9SMALL LETTER WE|
1c:0ARMENIAN CAPITAL LETTER SEH|2:oTIWN|6:oOH|5:9APOSTROPHE|3:9COMMA|4:9SMALL LETTER AYB|2:mGIM|
3:mZA|a:mHO|8:mVO|4:mRA|1:mSEH|4:mCO|1:mYIWN|2:mKEH|1:mOH|4:9FULL STOP|
1j:0HEBREW PUNCTUATION PASEQ|3:jSOF PASUQ|i:7LETTER VAV|3:eTET|1:eYOD|6:eFINAL NUN|2:eSAMEKH|
f:8IGATURE YIDDISH DOUBLE VAV|1:oVAV YOD|1:oDOUBLE YOD|1:7PUNCTUATION GERESH|1:mSHAYIM|
c:0ARABIC NUMBER SIGN|1:7SIGN SANAH|1:7FOOTNOTE MARKER|1:7SIGN SAFHA|1:eMVAT|
1:7NUMBER MARK ABOVE|8:7DATE SEPARATOR|f:7LETTER MARK|b:eALEF|w:eHEH|p:6-INDIC DIGIT ZERO|1:jONE|
4:jFIVE|2:jSEVEN|4:6 DECIMAL SEPARATOR|2:7FIVE POINTED STAR|29:7LETTER HEH DOACHASHMEE|3:iGOAL|
j:7FULL STOP|1:7LETTER AE|8:7END OF AYAH|j:0EXTENDED ARABIC-INDIC DIGIT ZERO|1:sONE|4:sFIVE|
2:sSEVEN|a:0SYRIAC SUPRALINEAR FULL STOP|1:9BLINEAR FULL STOP|1:9PRALINEAR COLON|
1:9BLINEAR COLON|b:7ABBREVIATION MARK|4x:0NKO DIGIT ZERO|a:4LETTER A|16:4HIGH TONE APOSTROPHE|
1:4LOW TONE APOSTROPHE|5:5AJANYALAN|46:0ARABIC POUND MARK ABOVE|1:8IASTRE MARK ABOVE|
29:7DISPUTED END OF AYAH|x:0DEVANAGARI SIGN VISARGA|2r:bDIGIT ZERO|3:hTHREE|
k:bLETTER GLOTTAL STOP|2x:0BENGALI DIGIT ZERO|4:eFOUR|3:eSEVEN|3d:0GURMUKHI DIGIT ZERO|1:fONE|
3:fFOUR|p:2JARATI SIGN VISARGA|2r:9DIGIT ZERO|3:fTHREE|q:0ORIYA SIGN VISARGA|t:6LETTER TTHA|
1y:6DIGIT ZERO|2:cTWO|3i:0TAMIL DIGIT ZERO|s:1ELUGU SIGN ANUSVARA|2s:7DIGIT ZERO|
s:0KANNADA SIGN ANUSVARA|2s:8DIGIT ZERO|s:0MALAYALAM SIGN ANUSVARA|t:aLETTER TTA|1:jHA|
1y:aDIGIT ZERO|7:gSEVEN|l:0SINHALA SIGN ANUSVARAYA|5q:0THAI DIGIT ZERO|3k:0LAO DIGIT ZERO|
8k:0MYANMAR LETTER NGA|p:fWA|z:8DIGIT ZERO|q:8LETTER MON NGA|3x:0GEORGIAN LETTER QAR|
o:gLABIAL SIGN|2o:0HANGUL CHOSEONG FILLER|1:7JUNGSEONG FILLER|4g:0ETHIOPIC SYLLABLE HA|
5s:iPHARYNGEAL A|5s:0CHEROKEE LETTER A|1:gE|1:gI|2:gU|1:gV|4:gGI|1:hO|1:hU|1:hV|2:gHE|5:gLA|4:hU|
4:gMI|2:hU|3:gNAH|2:hI|1:hO|b:gSE|1:hI|3:hV|2:gTA|1:gDE|4:hO|1:hU|4:gTLE|1:iI|3:iV|4:hSO|1:iU|
7:gWV|5:gYU|1:hV|c:1ANADIAN SYLLABICS HYPHEN|1b:jPE|4:kO|5:kA|i:jWEST-CREE P|2:jTE|r:kTE|6:jKI|
2:kO|3:kA|k:jSOUTH-SLAVEY KIH|1:xOH|1:xAH|5:jCO|t:jMA|l:jSAYISI M|3m:qYI|1n:jNUNAVUT H|1:jHK|
a:jTLHI|14:jAIVILIK B|5:jBLACKFOOT WE|h:jCARRIER GHO|p:rTHE|c:rPE|6:rGO|7:rKHE|3a:kHI SIGN|
1:jFULL STOP|i:0OGHAM SPACE MARK|1e:0RUNIC LETTER KAUNA|5:dGEBO GYFU G|a:dISAZ IS ISS I|
b:dSHORT-TWIG-SOL S|9:dOPEN-P|1:dEHWAZ EH E|m:6MULTIPLE PUNCTUATION|1:6CROSS PUNCTUATION|
20:0PHILIPPINE SINGLE PUNCTUATION|3j:0KHMER VOWEL INHERENT AQ|1:mA|17:6DIGIT ZERO|
z:0MONGOLIAN FULL STOP|6:aMANCHU FULL STOP|2:aFREE VARIATION SELECTOR ONE|1:yTWO|1:zHREE|
1:aVOWEL SEPARATOR|1:aFREE VARIATION SELECTOR FOUR|xw:0VEDIC SIGN NIHSHVASA|
1d:0LATIN LETTER SMALL CAPITAL C|b:rO|2:6SMALL LETTER SIDEWAYS O|b:6LETTER SMALL CAPITAL U|4:rV|
1:rW|1:rZ|4:0GREEK LETTER SMALL CAPITAL GAMMA|1x:0LATIN SMALL LETTER UE|o:jG WITH PALATAL HOOK|
9:jV WITH PALATAL HOOK|7l:jLONG S WITH HIGH STROKE|2q:jY WITH LOOP|5a:0GREEK KORONIS|
1:6PROSGEGRAMMENI|1:7SILI|1:7ERISPOMENI|1b:6VARIA|e:6OXIA|1:6DASIA|2:0EN QUAD|1:1M QUAD|
1:1N SPACE|1:1M SPACE|1:0THREE-PER-EM SPACE|1:0FOUR-PER-EM SPACE|1:0SIX-PER-EM SPACE|
1:0FIGURE SPACE|1:0PUNCTUATION SPACE|1:0THIN SPACE|1:0HAIR SPACE|1:0ZERO WIDTH SPACE|
1:bNON-JOINER|1:bJOINER|1:0LEFT-TO-RIGHT MARK|1:0RIGHT-TO-LEFT MARK|1:0HYPHEN|
1:0NON-BREAKING HYPHEN|1:0FIGURE DASH|1:0EN DASH|3:0DOUBLE VERTICAL LINE|
2:0LEFT SINGLE QUOTATION MARK|1:0RIGHT SINGLE QUOTATION MARK|1:0SINGLE LOW-9 QUOTATION MARK|
1:7HIGH-REVERSED-9 QUOTATION MARK|1:0LEFT DOUBLE QUOTATION MARK|1:0RIGHT DOUBLE QUOTATION MARK|
2:0DOUBLE HIGH-REVERSED-9 QUOTATION MARK|5:0ONE DOT LEADER|1:0TWO DOT LEADER|
1:0HORIZONTAL ELLIPSIS|2:0LINE SEPARATOR|1:0PARAGRAPH SEPARATOR|1:0LEFT-TO-RIGHT EMBEDDING|
1:0RIGHT-TO-LEFT EMBEDDING|1:0POP DIRECTIONAL FORMATTING|1:0LEFT-TO-RIGHT OVERRIDE|
1:0RIGHT-TO-LEFT OVERRIDE|1:0NARROW NO-BREAK SPACE|3:0PRIME|1:0DOUBLE PRIME|1:0TRIPLE PRIME|
1:0REVERSED PRIME|1:9DOUBLE PRIME|1:9TRIPLE PRIME|2:0SINGLE LEFT-POINTING ANGLE QUOTATION MARK|
1:7RIGHT-POINTING ANGLE QUOTATION MARK|2:0DOUBLE EXCLAMATION MARK|5:0CARET INSERTION POINT|
2:0HYPHEN BULLET|1:0FRACTION SLASH|3:0DOUBLE QUESTION MARK|1:0QUESTION EXCLAMATION MARK|
1:0EXCLAMATION QUESTION MARK|5:0LOW ASTERISK|5:0SWUNG DASH|4:0QUADRUPLE PRIME|
3:0TWO DOT PUNCTUATION|5:0MEDIUM MATHEMATICAL SPACE|1:0WORD JOINER|1:0FUNCTION APPLICATION|
1:0INVISIBLE TIMES|1:aSEPARATOR|1:aPLUS|2:0LEFT-TO-RIGHT ISOLATE|1:0RIGHT-TO-LEFT ISOLATE|
1:0FIRST STRONG ISOLATE|1:0POP DIRECTIONAL ISOLATE|1:0INHIBIT SYMMETRIC SWAPPING|
1:0ACTIVATE SYMMETRIC SWAPPING|1:0INHIBIT ARABIC FORM SHAPING|1:0ACTIVATE ARABIC FORM SHAPING|
1:0NATIONAL DIGIT SHAPES|1:1OMINAL DIGIT SHAPES|1l:0RUPEE SIGN|e:0LIVRE TOURNOIS SIGN|
22:0ACCOUNT OF|1:1DDRESSED TO THE SUBJECT|1:0DOUBLE-STRUCK CAPITAL C|3:0CARE OF|1:2DA UNA|
4:0SCRIPT SMALL G|1:7CAPITAL H|1:0BLACK-LETTER CAPITAL H|1:0DOUBLE-STRUCK CAPITAL H|
1:0PLANCK CONSTANT|2:0SCRIPT CAPITAL I|1:0BLACK-LETTER CAPITAL I|1:0SCRIPT CAPITAL L|1:7SMALL L|
2:0DOUBLE-STRUCK CAPITAL N|1:0NUMERO SIGN|3:0DOUBLE-STRUCK CAPITAL P|1:mQ|1:0SCRIPT CAPITAL R|
1:0BLACK-LETTER CAPITAL R|1:0DOUBLE-STRUCK CAPITAL R|4:0TELEPHONE SIGN|
3:0DOUBLE-STRUCK CAPITAL Z|4:0BLACK-LETTER CAPITAL Z|2:0KELVIN SIGN|2:0SCRIPT CAPITAL B|
1:0BLACK-LETTER CAPITAL C|1:0ESTIMATED SYMBOL|1:0SCRIPT SMALL E|1:7CAPITAL E|1:fF|2:fM|
1:7SMALL O|5:0INFORMATION SOURCE|2:0FACSIMILE SIGN|2:0DOUBLE-STRUCK SMALL GAMMA|
8:eITALIC CAPITAL D|1:lSMALL D|1:rE|1:rI|1:rJ|n:0ROMAN NUMERAL ONE|1:eTWO|1:fHREE|1:eFOUR|1:fIVE|
1:eSIX|1:fEVEN|1:eEIGHT|1:eNINE|1:eTEN|1:eELEVEN|1:eTWELVE|1:eFIFTY|1:eONE HUNDRED|
1:eFIVE HUNDRED|1:eONE THOUSAND|1:0SMALL ROMAN NUMERAL ONE|1:kTWO|1:lHREE|1:kFOUR|1:lIVE|1:kSIX|
1:lEVEN|1:kEIGHT|1:kNINE|1:kTEN|1:kELEVEN|1:kTWELVE|1:kFIFTY|1:kONE HUNDRED|1:kFIVE HUNDRED|
1:kONE THOUSAND|43:0MINUS SIGN|3:0DIVISION SLASH|1:0SET MINUS|1:0ASTERISK OPERATOR|7:0INFINITY|
5:0DIVIDES|2:0PARALLEL TO|3:0LOGICAL OR|2:0UNION|c:0RATIO|6:0TILDE OPERATOR|1a:0MUCH LESS-THAN|
1:5GREATER-THAN|1l:0DOWN TACK|t:0N-ARY LOGICAL OR|2:6UNION|l:0VERY MUCH LESS-THAN|
1:aGREATER-THAN|12:0Z NOTATION BAG MEMBERSHIP|38:0APL FUNCTIONAL SYMBOL IOTA|1:mRHO|6:mALPHA|
3n:0POWER ON SYMBOL|25:0OCR DOUBLE BACKSLASH|16:0PARENTHESIZED DIGIT ONE|1:kTWO|1:lHREE|1:kFOUR|
1:lIVE|1:kSIX|1:lEVEN|1:kEIGHT|1:kNINE|1:eNUMBER TEN|1:lELEVEN|1:lTWELVE|1:mHIRTEEN|1:lFOURTEEN|
1:mIFTEEN|1:lSIXTEEN|1:mEVENTEEN|1:lEIGHTEEN|1:lNINETEEN|1:lTWENTY|1:0DIGIT ONE FULL STOP|
1:6TWO FULL STOP|1:7HREE FULL STOP|1:6FOUR FULL STOP|1:7IVE FULL STOP|1:6SIX FULL STOP|
1:7EVEN FULL STOP|1:6EIGHT FULL STOP|1:6NINE FULL STOP|1:0NUMBER TEN FULL STOP|
1:7ELEVEN FULL STOP|1:7TWELVE FULL STOP|1:8HIRTEEN FULL STOP|1:7FOURTEEN FULL STOP|
1:8IFTEEN FULL STOP|1:7SIXTEEN FULL STOP|1:8EVENTEEN FULL STOP|1:7EIGHTEEN FULL STOP|
1:7NINETEEN FULL STOP|1:7TWENTY FULL STOP|1:0PARENTHESIZED LATIN SMALL LETTER A|1:xB|1:xC|1:xD|
1:xE|1:xF|1:xG|1:xH|1:xI|1:xJ|1:xK|1:xL|1:xM|1:xN|1:xO|1:xP|1:xQ|1:xR|1:xS|1:xT|1:xU|1:xV|1:xW|
1:xX|1:xY|1:xZ|58:0BOX DRAWINGS LIGHT DIAGONAL UPPER RIGHT TO LOWER LEFT|2:sCROSS|
dx:0MEDIUM LEFT PARENTHESIS ORNAMENT|1:7RIGHT PARENTHESIS ORNAMENT|
5:0HEAVY LEFT-POINTING ANGLE QUOTATION MARK ORNAMENT|
1:6RIGHT-POINTING ANGLE QUOTATION MARK ORNAMENT|3:0LIGHT LEFT TORTOISE SHELL BRACKET ORNAMENT|
1:6RIGHT TORTOISE SHELL BRACKET ORNAMENT|1:0MEDIUM LEFT CURLY BRACKET ORNAMENT|
1:7RIGHT CURLY BRACKET ORNAMENT|w:0HEAVY PLUS SIGN|1:6MINUS SIGN|
1h:0MATHEMATICAL RISING DIAGONAL|2:dFALLING DIAGONAL|c:0LARGE DOWN TACK|
9e:0RISING DIAGONAL CROSSING FALLING DIAGONAL|1:0FALLING DIAGONAL CROSSING RISING DIAGONAL|
5l:0REVERSE SOLIDUS OPERATOR|3:0BIG SOLIDUS|1:4REVERSE SOLIDUS|13:0Z NOTATION SCHEMA PIPING|
f:0VECTOR OR CROSS PRODUCT|1x:0DOUBLE COLON EQUAL|1:0TWO CONSECUTIVE EQUALS SIGNS|
1:1HREE CONSECUTIVE EQUALS SIGNS|1b:0GREATER-THAN BESIDE LESS-THAN|
2e:0TRIPLE SOLIDUS BINARY RELATION|2:0DOUBLE SOLIDUS OPERATOR|at:0COPTIC CAPITAL LETTER VIDA|
3:7SMALL LETTER GAMMA|9:7CAPITAL LETTER HATE|4:mIAUDA|1:7SMALL LETTER IAUDA|
1:7CAPITAL LETTER KAPA|4:mMI|2:mNI|2:mKSI|2:mO|1:7SMALL LETTER O|3:7CAPITAL LETTER RO|
1:7SMALL LETTER RO|1:7CAPITAL LETTER SIMA|1:7SMALL LETTER SIMA|1:7CAPITAL LETTER TAU|2:mUA|
1:7SMALL LETTER UA|3:7CAPITAL LETTER KHI|e:mDIALECT-P NI|1:7SMALL LETTER DIALECT-P NI|
2:kCRYPTOGRAMMIC NI|7:7CAPITAL LETTER OLD COPTIC SHEI|2:xESH|1:7SMALL LETTER OLD COPTIC ESH|
3:7CAPITAL LETTER DIALECT-P HORI|1:7SMALL LETTER DIALECT-P HORI|
1:7CAPITAL LETTER OLD COPTIC HORI|2:yA|1:7SMALL LETTER OLD COPTIC HA|
1:7CAPITAL LETTER L-SHAPED HA|2:mOLD COPTIC HEI|1:7SMALL LETTER OLD COPTIC HEI|
9:7CAPITAL LETTER OLD NUBIAN SHIMA|t:7OLD NUBIAN FULL STOP|1r:0TIFINAGH LETTER YADH|1:jD|m:iN|
2:gTUAREG YANG|3:gYAR|1:jR|8:iTH|5n:0LEFT DOUBLE PARENTHESIS|1:0RIGHT DOUBLE PARENTHESIS|
n:0DOUBLE HYPHEN|5e:0KANGXI RADICAL DOT|1:fSLASH|71:0IDEOGRAPHIC SPACE|3:0DITTO MARK|
4:0IDEOGRAPHIC NUMBER ZERO|d:0LEFT TORTOISE SHELL BRACKET|1:0RIGHT TORTOISE SHELL BRACKET|
u:0VERTICAL KANA REPEAT MARK UPPER HALF|31:0KATAKANA-HIRAGANA DOUBLE HYPHEN|1a:8 LETTER NO|
46:0HANGUL FILLER|33:0CJK STROKE SP|1:bD|mpo:0LISU LETTER BA|1:cPA|1:dHA|1:cDA|1:cTA|2:cGA|1:cKA|
2:cJA|1:cCA|2:cDZA|1:cTSA|2:cMA|1:cNA|1:cLA|1:cSA|1:cZHA|3:cHA|1:cXA|3:cWA|1:cSHA|1:cYA|2:cA|
2:cE|2:cI|1:cO|1:cU|4:cTONE MYA TI|1:hNA PO|1:hMYA CYA|1:lBO|2:lJEU|1:5PUNCTUATION COMMA|
1:hFULL STOP|7j:0VAI FULL STOP|1i:0CYRILLIC CAPITAL LETTER REVERSED DZE|3:9SMALL LETTER IOTA|
29:9CAPITAL LETTER DOUBLE O|1:9SMALL LETTER DOUBLE O|1y:0BAMUM LETTER KO|c:dNTUU|4:dKOGHOM|
1l:0LATIN CAPITAL LETTER TZ|9:6LETTER SMALL CAPITAL S|1:6CAPITAL LETTER AA|1:6SMALL LETTER AA|
1:6CAPITAL LETTER AO|1:6SMALL LETTER AO|1:6CAPITAL LETTER AU|1:6SMALL LETTER AU|
1:6CAPITAL LETTER AV|1:6SMALL LETTER AV|1:6CAPITAL LETTER AV WITH HORIZONTAL BAR|
1:6SMALL LETTER AV WITH HORIZONTAL BAR|1:6CAPITAL LETTER AY|1:6SMALL LETTER AY|
h:6CAPITAL LETTER OO|1:6SMALL LETTER OO|b:6CAPITAL LETTER R ROTUNDA|g:lET|4:lCON|
9:6SMALL LETTER TUM|1:jUM|h:0MODIFIER LETTER COLON|3:0LATIN SMALL LETTER SALTILLO|
c:6CAPITAL LETTER F WITH STROKE|1:6SMALL LETTER F WITH STROKE|6:jVOLAPUK UE|
c:6CAPITAL LETTER REVERSED OPEN E|7:lJ WITH CROSSED-TAIL|1:lCHI|1:lBETA|
ou:6SMALL LETTER BLACKLETTER E|3:jLENIS F|8:jBLACKLETTER O|a:jR WITHOUT HANDLE|1:jDOUBLE R|
6:jU WITH SHORT RIGHT LEG|4:qLEFT HOOK|8:jY WITH SHORT RIGHT LEG|9:jUO|
i:0CHEROKEE SMALL LETTER V|c:mHU|2:mLA|g:mNO|m:mDO|1:nU|5:mTLI|fo1:0LATIN SMALL LIGATURE FF|1:mI|
1:mL|1:mFI|1:nL|2:lST|z:0HEBREW LETTER ALTERNATIVE PLUS SIGN|
3h:0ARABIC LETTER HEH GOAL ISOLATED FORM|1:nFINAL FORM|1:nINITIAL FORM|1:nMEDIAL FORM|
1:iDOACHASHMEE ISOLATED FORM|1:uFINAL FORM|1:uINITIAL FORM|1:uMEDIAL FORM|
b5:0ORNATE LEFT PARENTHESIS|1:7RIGHT PARENTHESIS|
6p:0PRESENTATION FORM FOR VERTICAL TWO DOT LEADER|t:0DASHED LOW LINE|1:0CENTRELINE LOW LINE|
1:0WAVY LOW LINE|9:0SMALL EM DASH|g:6REVERSE SOLIDUS|11:0ARABIC LETTER ALEF ISOLATED FORM|
1:jFINAL FORM|2j:eHEH ISOLATED FORM|1:iFINAL FORM|1:iINITIAL FORM|1:iMEDIAL FORM|
j:0ZERO WIDTH NO-BREAK SPACE|2:0FULLWIDTH EXCLAMATION MARK|1:aQUOTATION MARK|1:aNUMBER SIGN|
1:aDOLLAR SIGN|1:aPERCENT SIGN|1:aAMPERSAND|1:bPOSTROPHE|1:aLEFT PARENTHESIS|
1:aRIGHT PARENTHESIS|1:aASTERISK|1:aPLUS SIGN|1:aCOMMA|1:aHYPHEN-MINUS|1:aFULL STOP|1:aSOLIDUS|
1:aDIGIT ZERO|1:gONE|1:gTWO|1:hHREE|1:gFOUR|1:hIVE|1:gSIX|1:hEVEN|1:gEIGHT|1:gNINE|1:aCOLON|
1:aSEMICOLON|1:aLESS-THAN SIGN|1:aEQUALS SIGN|1:aGREATER-THAN SIGN|1:aQUESTION MARK|
1:aCOMMERCIAL AT|1:aLATIN CAPITAL LETTER A|1:vB|1:vC|1:vD|1:vE|1:vF|1:vG|1:vH|1:vI|1:vJ|1:vK|
1:vL|1:vM|1:vN|1:vO|1:vP|1:vQ|1:vR|1:vS|1:vT|1:vU|1:vV|1:vW|1:vX|1:vY|1:vZ|1:bEFT SQUARE BRACKET|
1:aREVERSE SOLIDUS|1:bIGHT SQUARE BRACKET|1:aCIRCUMFLEX ACCENT|1:aLOW LINE|1:aGRAVE ACCENT|
1:aLATIN SMALL LETTER A|1:tB|1:tC|1:tD|1:tE|1:tF|1:tG|1:tH|1:tI|1:tJ|1:tK|1:tL|1:tM|1:tN|1:tO|
1:tP|1:tQ|1:tR|1:tS|1:tT|1:tU|1:tV|1:tW|1:tX|1:tY|1:tZ|1:bEFT CURLY BRACKET|1:aVERTICAL LINE|
1:aRIGHT CURLY BRACKET|1:aTILDE|1u:0HALFWIDTH HANGUL FILLER|20:aFORMS LIGHT VERTICAL|
h:0INTERLINEAR ANNOTATION ANCHOR|1:nSEPARATOR|1:nTERMINATOR|hz:0LYCIAN LETTER B|4:eI|1:eW|3:eJ|
6:eMM|2:eU|3:eR|1:eS|1:eT|4:eH|5:0CARIAN LETTER A|1:eP2|1:eD|3:eR|6:eO|5:eS|1:eC-18|1:eU|2:eX|
r:eE2|12:1OPTIC EPACT NUMBER THREE HUNDRED|c:0OLD ITALIC LETTER BE|1:iKE|7:iI|8:iSHE|4:iTE|
2:iEKS|3:jF|5:jSS|1:bNUMERAL ONE|2:jTEN|6a:0DESERET CAPITAL LETTER LONG O|h:nCHEE|6:nETH|5:nZHEE|
c:8SMALL LETTER LONG O|h:lCHEE|b:lZHEE|30:0OSAGE CAPITAL LETTER BRA|e:lO|c:lU|4:lZA|
o:6SMALL LETTER O|c:jU|t:0ELBASAN LETTER NE|3:fO|2:fQE|4:fSHE|1:fTE|8:fGHE|1:hAMMA|1:fKHE|
10p:0KHAROSHTHI PUNCTUATION DOT|19p:1AITHI NUMBER SIGN|g:i ABOVE|sj:0TIRHUTA DIGIT ZERO|
fk:0AHOM LETTER KA|6:cPA|4:cJA|4:cLA|1:cSA|b5:0WARANG CITI CAPITAL LETTER NGAA|2:rWI|1:rYU|1:sA|
2:rII|3:rO|3:rKO|2:rYUJ|1:rUC|3:rTTE|3:rAT|3:rPU|3:rHORR|1:sAR|4:cSMALL LETTER NGAA|1:pA|1:pWI|
1:pYU|1:qA|2:pII|2:pE|2:pANG|2:pKO|9:pAT|1:qM|1:pBU|1:pPU|4:pHAR|4:cDIGIT ZERO|3:iTHREE|2:iFIVE|
1:iSIX|3:iNINE|3:cNUMBER THIRTY|3:jSIXTY|3:jNINETY|yv:0TOLONG SIKI SIGN SELA|1:hHECAKA|
6:cDIGIT ZERO|1:iONE|4en:0EGYPTIAN HIEROGLYPH VERTICAL JOINER|1:kHORIZONTAL JOINER|
1:kINSERT AT TOP START|1:uBOTTOM START|1:uTOP END|1:uBOTTOM END|1:kOVERLAY MIDDLE|
1:kBEGIN SEGMENT|1:kEND SEGMENT|1:kINSERT AT MIDDLE|1:uTOP|1:uBOTTOM|1:kBEGIN ENCLOSURE|
1:kEND ENCLOSURE|1:kBEGIN WALLED ENCLOSURE|1:kEND WALLED ENCLOSURE|
bjf:0BERIA ERFE CAPITAL LETTER LAKKO|c:qUI|2a:0MIAO LETTER VA|2:cTA|c:cLA|i:cGHA|d:cZHA|5:cSA|
1:cZA|4:cARCHAIC ZZA|1:cZZYA|2:cWA|1:cAH|e:5SIGN ASPIRATION|1:aREFORMED VOICING|
f9q:0SHORTHAND FORMAT LETTER OVERLAP|1:hCONTINUING OVERLAP|1:hDOWN STEP|1:hUP STEP|
377:0OUTLINED LATIN CAPITAL LETTER A|1:uB|1:uC|1:uD|1:uE|1:uF|1:uG|1:uH|1:uI|1:uJ|1:uK|1:uL|1:uM|
1:uN|1:uO|1:uP|1:uQ|1:uR|1:uS|1:uT|1:uU|1:uV|1:uW|1:uX|1:uY|1:uZ|1:9DIGIT ZERO|1:fONE|1:fTWO|
1:gHREE|1:fFOUR|1:gIVE|1:fSIX|1:gEVEN|1:fEIGHT|1:fNINE|t7:0MUSICAL SYMBOL BRACE|
2h:fCOMBINING AUGMENTATION DOT|6:fBEGIN BEAM|1:fEND BEAM|1:fBEGIN TIE|1:fEND TIE|1:fBEGIN SLUR|
1:fEND SLUR|1:fBEGIN PHRASE|1:fEND PHRASE|3w:0GREEK VOCAL NOTATION SYMBOL-7|7:s14|2:t6|3:t9|
1:s20|3:t3|k:6INSTRUMENTAL NOTATION SYMBOL-23|c:z40|1:z42|3:z47|1:z48|
cl:0MATHEMATICAL BOLD CAPITAL A|1:qB|1:qC|1:qD|1:qE|1:qF|1:qG|1:qH|1:qI|1:qJ|1:qK|1:qL|1:qM|1:qN|
1:qO|1:qP|1:qQ|1:qR|1:qS|1:qT|1:qU|1:qV|1:qW|1:qX|1:qY|1:qZ|1:iSMALL A|1:oB|1:oC|1:oD|1:oE|1:oF|
1:oG|1:oH|1:oI|1:oJ|1:oK|1:oL|1:oM|1:oN|1:oO|1:oP|1:oQ|1:oR|1:oS|1:oT|1:oU|1:oV|1:oW|1:oX|1:oY|
1:oZ|1:dITALIC CAPITAL A|1:sB|1:sC|1:sD|1:sE|1:sF|1:sG|1:sH|1:sI|1:sJ|1:sK|1:sL|1:sM|1:sN|1:sO|
1:sP|1:sQ|1:sR|1:sS|1:sT|1:sU|1:sV|1:sW|1:sX|1:sY|1:sZ|1:kSMALL A|1:qB|1:qC|1:qD|1:qE|1:qF|1:qG|
2:qI|1:qJ|1:qK|1:qL|1:qM|1:qN|1:qO|1:qP|1:qQ|1:qR|1:qS|1:qT|1:qU|1:qV|1:qW|1:qX|1:qY|1:qZ|
1:dBOLD ITALIC CAPITAL A|1:xB|1:xC|1:xD|1:xE|1:xF|1:xG|1:xH|1:xI|1:xJ|1:xK|1:xL|1:xM|1:xN|1:xO|
1:xP|1:xQ|1:xR|1:xS|1:xT|1:xU|1:xV|1:xW|1:xX|1:xY|1:xZ|1:pSMALL A|1:vB|1:vC|1:vD|1:vE|1:vF|1:vG|
1:vH|1:vI|1:vJ|1:vK|1:vL|1:vM|1:vN|1:vO|1:vP|1:vQ|1:vR|1:vS|1:vT|1:vU|1:vV|1:vW|1:vX|1:vY|1:vZ|
1:dSCRIPT CAPITAL A|2:sC|1:sD|3:sG|3:sJ|1:sK|3:sN|1:sO|1:sP|1:sQ|2:sS|1:sT|1:sU|1:sV|1:sW|1:sX|
1:sY|1:sZ|1:kSMALL A|1:qB|1:qC|1:qD|2:qF|2:qH|1:qI|1:qJ|1:qK|1:qL|1:qM|1:qN|2:qP|1:qQ|1:qR|1:qS|
1:qT|1:qU|1:qV|1:qW|1:qX|1:qY|1:qZ|1:dBOLD SCRIPT CAPITAL A|1:xB|1:xC|1:xD|1:xE|1:xF|1:xG|1:xH|
1:xI|1:xJ|1:xK|1:xL|1:xM|1:xN|1:xO|1:xP|1:xQ|1:xR|1:xS|1:xT|1:xU|1:xV|1:xW|1:xX|1:xY|1:xZ|
1:pSMALL A|1:vB|1:vC|1:vD|1:vE|1:vF|1:vG|1:vH|1:vI|1:vJ|1:vK|1:vL|1:vM|1:vN|1:vO|1:vP|1:vQ|1:vR|
1:vS|1:vT|1:vU|1:vV|1:vW|1:vX|1:vY|1:vZ|1:dFRAKTUR CAPITAL A|1:tB|2:tD|1:tE|1:tF|1:tG|3:tJ|1:tK|
1:tL|1:tM|1:tN|1:tO|1:tP|1:tQ|2:tS|1:tT|1:tU|1:tV|1:tW|1:tX|1:tY|2:lSMALL A|1:rB|1:rC|1:rD|1:rE|
1:rF|1:rG|1:rH|1:rI|1:rJ|1:rK|1:rL|1:rM|1:rN|1:rO|1:rP|1:rQ|1:rR|1:rS|1:rT|1:rU|1:rV|1:rW|1:rX|
1:rY|1:rZ|1:dDOUBLE-STRUCK CAPITAL A|1:zB|2:zD|1:zE|1:zF|1:zG|2:zI|1:zJ|1:zK|1:zL|1:zM|2:zO|4:zS|
1:zT|1:zU|1:zV|1:zW|1:zX|1:zY|2:rSMALL A|1:xB|1:xC|1:xD|1:xE|1:xF|1:xG|1:xH|1:xI|1:xJ|1:xK|1:xL|
1:xM|1:xN|1:xO|1:xP|1:xQ|1:xR|1:xS|1:xT|1:xU|1:xV|1:xW|1:xX|1:xY|1:xZ|1:dBOLD FRAKTUR CAPITAL A|
1:yB|1:yC|1:yD|1:yE|1:yF|1:yG|1:yH|1:yI|1:yJ|1:yK|1:yL|1:yM|1:yN|1:yO|1:yP|1:yQ|1:yR|1:yS|1:yT|
1:yU|1:yV|1:yW|1:yX|1:yY|1:yZ|1:qSMALL A|1:wB|1:wC|1:wD|1:wE|1:wF|1:wG|1:wH|1:wI|1:wJ|1:wK|1:wL|
1:wM|1:wN|1:wO|1:wP|1:wQ|1:wR|1:wS|1:wT|1:wU|1:wV|1:wW|1:wX|1:wY|1:wZ|1:dSANS-SERIF CAPITAL A|
1:wB|1:wC|1:wD|1:wE|1:wF|1:wG|1:wH|1:wI|1:wJ|1:wK|1:wL|1:wM|1:wN|1:wO|1:wP|1:wQ|1:wR|1:wS|1:wT|
1:wU|1:wV|1:wW|1:wX|1:wY|1:wZ|1:oSMALL A|1:uB|1:uC|1:uD|1:uE|1:uF|1:uG|1:uH|1:uI|1:uJ|1:uK|1:uL|
1:uM|1:uN|1:uO|1:uP|1:uQ|1:uR|1:uS|1:uT|1:uU|1:uV|1:uW|1:uX|1:uY|1:uZ|1:oBOLD CAPITAL A|1:zL B|
1:zL C|1:zL D|1:zL E|1:zL F|1:zL G|1:zL H|1:zL I|1:zL J|1:zL K|1:zL L|1:zL M|1:zL N|1:zL O|
1:zL P|1:zL Q|1:zL R|1:zL S|1:zL T|1:zL U|1:zL V|1:zL W|1:zL X|1:zL Y|1:zL Z|1:tSMALL A|1:zB|
1:zC|1:zD|1:zE|1:zF|1:zG|1:zH|1:zI|1:zJ|1:zK|1:zL|1:zM|1:zN|1:zO|1:zP|1:zQ|1:zR|1:zS|1:zT|1:zU|
1:zV|1:zW|1:zX|1:zY|1:zZ|1:oITALIC CAPITAL A|1:zTAL B|1:zTAL C|1:zTAL D|1:zTAL E|1:zTAL F|
1:zTAL G|1:zTAL H|1:zTAL I|1:zTAL J|1:zTAL K|1:zTAL L|1:zTAL M|1:zTAL N|1:zTAL O|1:zTAL P|
1:zTAL Q|1:zTAL R|1:zTAL S|1:zTAL T|1:zTAL U|1:zTAL V|1:zTAL W|1:zTAL X|1:zTAL Y|1:zTAL Z|
1:vSMALL A|1:zL B|1:zL C|1:zL D|1:zL E|1:zL F|1:zL G|1:zL H|1:zL I|1:zL J|1:zL K|1:zL L|1:zL M|
1:zL N|1:zL O|1:zL P|1:zL Q|1:zL R|1:zL S|1:zL T|1:zL U|1:zL V|1:zL W|1:zL X|1:zL Y|1:zL Z|
1:oBOLD ITALIC CAPITAL A|1:z CAPITAL B|1:z CAPITAL C|1:z CAPITAL D|1:z CAPITAL E|1:z CAPITAL F|
1:z CAPITAL G|1:z CAPITAL H|1:z CAPITAL I|1:z CAPITAL J|1:z CAPITAL K|1:z CAPITAL L|
1:z CAPITAL M|1:z CAPITAL N|1:z CAPITAL O|1:z CAPITAL P|1:z CAPITAL Q|1:z CAPITAL R|
1:z CAPITAL S|1:z CAPITAL T|1:z CAPITAL U|1:z CAPITAL V|1:z CAPITAL W|1:z CAPITAL X|
1:z CAPITAL Y|1:z CAPITAL Z|1:z SMALL A|1:z SMALL B|1:z SMALL C|1:z SMALL D|1:z SMALL E|
1:z SMALL F|1:z SMALL G|1:z SMALL H|1:z SMALL I|1:z SMALL J|1:z SMALL K|1:z SMALL L|1:z SMALL M|
1:z SMALL N|1:z SMALL O|1:z SMALL P|1:z SMALL Q|1:z SMALL R|1:z SMALL S|1:z SMALL T|1:z SMALL U|
1:z SMALL V|1:z SMALL W|1:z SMALL X|1:z SMALL Y|1:z SMALL Z|1:dMONOSPACE CAPITAL A|1:vB|1:vC|
1:vD|1:vE|1:vF|1:vG|1:vH|1:vI|1:vJ|1:vK|1:vL|1:vM|1:vN|1:vO|1:vP|1:vQ|1:vR|1:vS|1:vT|1:vU|1:vV|
1:vW|1:vX|1:vY|1:vZ|1:nSMALL A|1:tB|1:tC|1:tD|1:tE|1:tF|1:tG|1:tH|1:tI|1:tJ|1:tK|1:tL|1:tM|1:tN|
1:tO|1:tP|1:tQ|1:tR|1:tS|1:tT|1:tU|1:tV|1:tW|1:tX|1:tY|1:tZ|1:dITALIC SMALL DOTLESS I|
4:dBOLD CAPITAL ALPHA|1:qBETA|3:qEPSILON|1:qZETA|1:qETA|2:qIOTA|1:qKAPPA|2:qMU|1:qNU|2:qOMICRON|
2:qRHO|3:qTAU|1:qUPSILON|2:qCHI|4:iSMALL ALPHA|2:oGAMMA|6:oIOTA|4:oNU|2:oOMICRON|2:oRHO|2:oSIGMA|
2:oUPSILON|a:iRHO SYMBOL|2:dITALIC CAPITAL ALPHA|1:sBETA|3:sEPSILON|1:sZETA|1:sETA|2:sIOTA|
1:sKAPPA|2:sMU|1:sNU|2:sOMICRON|2:sRHO|3:sTAU|1:sUPSILON|2:sCHI|4:kSMALL ALPHA|2:qGAMMA|6:qIOTA|
4:qNU|2:qOMICRON|2:qRHO|2:qSIGMA|2:qUPSILON|a:kRHO SYMBOL|2:dBOLD ITALIC CAPITAL ALPHA|1:xBETA|
3:xEPSILON|1:xZETA|1:xETA|2:xIOTA|1:xKAPPA|2:xMU|1:xNU|2:xOMICRON|2:xRHO|3:xTAU|1:xUPSILON|
2:xCHI|4:pSMALL ALPHA|2:vGAMMA|6:vIOTA|4:vNU|2:vOMICRON|2:vRHO|2:vSIGMA|2:vUPSILON|a:pRHO SYMBOL|
2:dSANS-SERIF BOLD CAPITAL ALPHA|1:zL BETA|3:zL EPSILON|1:zL ZETA|1:zL ETA|2:zL IOTA|1:zL KAPPA|
2:zL MU|1:zL NU|2:zL OMICRON|2:zL RHO|3:zL TAU|1:zL UPSILON|2:zL CHI|4:tSMALL ALPHA|2:zGAMMA|
6:zIOTA|4:zNU|2:zOMICRON|2:zRHO|2:zSIGMA|2:zUPSILON|a:tRHO SYMBOL|2:tITALIC CAPITAL ALPHA|
1:z CAPITAL BETA|3:z CAPITAL EPSILON|1:z CAPITAL ZETA|1:z CAPITAL ETA|2:z CAPITAL IOTA|
1:z CAPITAL KAPPA|2:z CAPITAL MU|1:z CAPITAL NU|2:z CAPITAL OMICRON|2:z CAPITAL RHO|
3:z CAPITAL TAU|1:z CAPITAL UPSILON|2:z CAPITAL CHI|4:z SMALL ALPHA|2:z SMALL GAMMA|
6:z SMALL IOTA|4:z SMALL NU|2:z SMALL OMICRON|2:z SMALL RHO|2:z SMALL SIGMA|2:z SMALL UPSILON|
a:z RHO SYMBOL|2:dBOLD CAPITAL DIGAMMA|4:iDIGIT ZERO|1:oONE|1:oTWO|1:pHREE|1:oFOUR|1:pIVE|1:oSIX|
1:pEVEN|1:oEIGHT|1:oNINE|1:dDOUBLE-STRUCK DIGIT ZERO|1:xONE|1:xTWO|1:yHREE|1:xFOUR|1:yIVE|1:xSIX|
1:yEVEN|1:xEIGHT|1:xNINE|1:dSANS-SERIF DIGIT ZERO|1:uONE|1:uTWO|1:vHREE|1:uFOUR|1:vIVE|1:uSIX|
1:vEVEN|1:uEIGHT|1:uNINE|1:oBOLD DIGIT ZERO|1:zONE|1:zTWO|1:zTHREE|1:zFOUR|1:zFIVE|1:zSIX|
1:zSEVEN|1:zEIGHT|1:zNINE|1:dMONOSPACE DIGIT ZERO|1:tONE|1:tTWO|1:uHREE|1:tFOUR|1:uIVE|1:tSIX|
1:uEVEN|1:tEIGHT|1:tNINE|2y2:0TAI YO LETTER IA|da:0MENDE KIKAKUI DIGIT ONE|4:kFIVE|
111:0ARABIC MATHEMATICAL ALEF|10:kINITIAL HEH|1s:kSTRETCHED HEH|s:kLOOPED ALEF|4:rHEH|
ho:0DIGIT ZERO FULL STOP|1:bCOMMA|1:6ONE COMMA|1:6TWO COMMA|1:7HREE COMMA|1:6FOUR COMMA|
1:7IVE COMMA|1:6SIX COMMA|1:7EVEN COMMA|1:6EIGHT COMMA|1:6NINE COMMA|
6:0PARENTHESIZED LATIN CAPITAL LETTER A|1:zB|1:zC|1:zD|1:zE|1:zF|1:zG|1:zH|1:zI|1:zJ|1:zK|1:zL|
1:zM|1:zN|1:zO|1:zP|1:zQ|1:zR|1:zS|1:zT|1:zU|1:zV|1:zW|1:zX|1:zY|1:zZ|
1:0TORTOISE SHELL BRACKETED LATIN CAPITAL LETTER S|15i:0ALCHEMICAL SYMBOL FOR QUINTESSENCE|
7:mAQUA REGIA-2|1x:mCALX|g:mSTRATUM SUPER STRATUM|c:mCRUCIBLE-4|3:mBATH OF MARY|1:uVAPOURS|
w4:0SEGMENTED DIGIT ZERO|1:gONE|1:gTWO|1:hHREE|1:gFOUR|1:hIVE|1:gSIX|1:hEVEN|1:gEIGHT|1:gNINE|
gvm0:0LANGUAGE TAG|v:0TAG SPACE|1:4EXCLAMATION MARK|1:4QUOTATION MARK|1:4NUMBER SIGN|
1:4DOLLAR SIGN|1:4PERCENT SIGN|1:4AMPERSAND|1:5POSTROPHE|1:4LEFT PARENTHESIS|
1:4RIGHT PARENTHESIS|1:4ASTERISK|1:4PLUS SIGN|1:4COMMA|1:4HYPHEN-MINUS|1:4FULL STOP|1:4SOLIDUS|
1:4DIGIT ZERO|1:aONE|1:aTWO|1:bHREE|1:aFOUR|1:bIVE|1:aSIX|1:bEVEN|1:aEIGHT|1:aNINE|1:4COLON|
1:4SEMICOLON|1:4LESS-THAN SIGN|1:4EQUALS SIGN|1:4GREATER-THAN SIGN|1:4QUESTION MARK|
1:4COMMERCIAL AT|1:4LATIN CAPITAL LETTER A|1:pB|1:pC|1:pD|1:pE|1:pF|1:pG|1:pH|1:pI|1:pJ|1:pK|
1:pL|1:pM|1:pN|1:pO|1:pP|1:pQ|1:pR|1:pS|1:pT|1:pU|1:pV|1:pW|1:pX|1:pY|1:pZ|1:5EFT SQUARE BRACKET|
1:4REVERSE SOLIDUS|1:5IGHT SQUARE BRACKET|1:4CIRCUMFLEX ACCENT|1:4LOW LINE|1:4GRAVE ACCENT|
1:4LATIN SMALL LETTER A|1:nB|1:nC|1:nD|1:nE|1:nF|1:nG|1:nH|1:nI|1:nJ|1:nK|1:nL|1:nM|1:nN|1:nO|
1:nP|1:nQ|1:nR|1:nS|1:nT|1:nU|1:nV|1:nW|1:nX|1:nY|1:nZ|1:5EFT CURLY BRACKET|1:4VERTICAL LINE|
1:4RIGHT CURLY BRACKET|1:4TILDE|1:0CANCEL TAG
`

/** The scripts of Unicode 17.0.0 `Scripts.txt`, the ones most text is written in first. */
const scriptNames = `
Latin Common Inherited Cyrillic Greek Han Hiragana Katakana Arabic Hebrew Hangul Adlam Ahom 
Anatolian_Hieroglyphs Armenian Avestan Balinese Bamum Bassa_Vah Batak Bengali Beria_Erfe 
Bhaiksuki Bopomofo Brahmi Braille Buginese Buhid Canadian_Aboriginal Carian Caucasian_Albanian 
Chakma Cham Cherokee Chorasmian Coptic Cuneiform Cypriot Cypro_Minoan Deseret Devanagari 
Dives_Akuru Dogra Duployan Egyptian_Hieroglyphs Elbasan Elymaic Ethiopic Garay Georgian 
Glagolitic Gothic Grantha Gujarati Gunjala_Gondi Gurmukhi Gurung_Khema Hanifi_Rohingya Hanunoo 
Hatran Imperial_Aramaic Inscriptional_Pahlavi Inscriptional_Parthian Javanese Kaithi Kannada 
Kawi Kayah_Li Kharoshthi Khitan_Small_Script Khmer Khojki Khudawadi Kirat_Rai Lao Lepcha Limbu 
Linear_A Linear_B Lisu Lycian Lydian Mahajani Makasar Malayalam Mandaic Manichaean Marchen 
Masaram_Gondi Medefaidrin Meetei_Mayek Mende_Kikakui Meroitic_Cursive Meroitic_Hieroglyphs Miao 
Modi Mongolian Mro Multani Myanmar Nabataean Nag_Mundari Nandinagari New_Tai_Lue Newa Nko Nushu 
Nyiakeng_Puachue_Hmong Ogham Ol_Chiki Ol_Onal Old_Hungarian Old_Italic Old_North_Arabian 
Old_Permic Old_Persian Old_Sogdian Old_South_Arabian Old_Turkic Old_Uyghur Oriya Osage Osmanya 
Pahawh_Hmong Palmyrene Pau_Cin_Hau Phags_Pa Phoenician Psalter_Pahlavi Rejang Runic Samaritan 
Saurashtra Sharada Shavian Siddham Sidetic SignWriting Sinhala Sogdian Sora_Sompeng Soyombo 
Sundanese Sunuwar Syloti_Nagri Syriac Tagalog Tagbanwa Tai_Le Tai_Tham Tai_Viet Tai_Yo Takri 
Tamil Tangsa Tangut Telugu Thaana Thai Tibetan Tifinagh Tirhuta Todhri Tolong_Siki Toto 
Tulu_Tigalari Ugaritic Vai Vithkuqi Wancho Warang_Citi Yezidi Yi Zanabazar_Square
`

let prototypes: Map<number, string> | undefined
let lookalikes: Map<number, string> | undefined
let names: Map<number, string> | undefined

/**
 * Walk one grouped table.
 *
 * @param groups - A table in the layout of `prototypeGroups`.
 * @param visit - Called with each source code point and the code points left of its colon.
 */
function eachSource(
  groups: string,
  visit: (source: number, target: readonly number[]) => void,
): void {
  for (const group of groups.trim().split(/\s+/)) {
    const [left = '', right = ''] = group.split(':')
    const target = left.split('.').map((digits) => Number.parseInt(digits, 36))
    let source = 0
    for (const gap of right.split(',')) {
      source += Number.parseInt(gap, 36)
      visit(source, target)
    }
  }
}

/**
 * The prototype each confusable character folds to, as UTS #39 skeletons use it.
 *
 * @returns {ReadonlyMap<number, string>} Code point to prototype, which may be several characters.
 */
export function confusablePrototypes(): ReadonlyMap<number, string> {
  if (prototypes !== undefined) return prototypes
  const table = new Map<number, string>()
  eachSource(prototypeGroups, (source, target) => {
    table.set(source, String.fromCodePoint(...target))
  })
  prototypes = table
  return table
}

/**
 * The ASCII a character outside ASCII is taken for.
 *
 * @returns {ReadonlyMap<number, string>} Code point to ASCII, `rn` and `...` among the few longer ones.
 */
export function asciiLookalikes(): ReadonlyMap<number, string> {
  if (lookalikes !== undefined) return lookalikes
  const table = new Map<number, string>()
  for (const [source, prototype] of confusablePrototypes()) {
    if (source > 0x7f && /^[\0-\x7F]+$/.test(prototype)) table.set(source, prototype)
  }
  eachSource(lookalikeGroups, (source, target) => {
    table.set(source, String.fromCodePoint(...target))
  })
  lookalikes = table
  return table
}

/**
 * Names of the characters `nameEntries` covers.
 *
 * @returns {ReadonlyMap<number, string>} Code point to its Unicode name.
 */
export function characterNames(): ReadonlyMap<number, string> {
  if (names !== undefined) return names
  const table = new Map<number, string>()
  let codePoint = 0
  let name = ''
  for (const entry of nameEntries.trim().split(/\|\n?/)) {
    const colon = entry.indexOf(':')
    codePoint += Number.parseInt(entry.slice(0, colon), 36)
    name = name.slice(0, Number.parseInt(entry[colon + 1] ?? '0', 36)) + entry.slice(colon + 2)
    table.set(codePoint, name)
  }
  names = table
  return table
}

/**
 * Script names as `\p{Script=...}` takes them.
 *
 * @returns {string[]} Every script, Latin first.
 */
export function unicodeScripts(): string[] {
  return scriptNames.trim().split(/\s+/)
}
