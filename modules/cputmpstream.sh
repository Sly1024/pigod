#!/bin/sh
while [ : ]
do
    /opt/vc/bin/vcgencmd measure_temp
    /opt/vc/bin/vcgencmd measure_volts core
    /opt/vc/bin/vcgencmd measure_clock arm
    sleep 2
done
