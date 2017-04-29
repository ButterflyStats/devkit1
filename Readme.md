BF devkit
=========

Essentially the full source code to devkit.d2playback.com, minus the audio decoding.

I would not recommend building or adding to this project because most of the code is rather slow and I've only written this
to help me personally work better with replays.

Considering looking at the heavily unfinished `devkit2` project to get a better starting point.

Project status
==============

I won't work on this anymore, feel free to write me a mail if you want to take over.

License
=======

Apache 2.0

Building
========

I haven't build / updated this in a while. The `bin/build.sh` and `bin/release.sh` scripts are a good starting point.
There are some hardcoded path's to the butterfly parser that you might want to change depdending.
