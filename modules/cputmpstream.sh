#!/bin/sh
while [ : ]
do
    /opt/vc/bin/vcgencmd measure_temp
    /opt/vc/bin/vcgencmd measure_volts core
    sleep 2
done
