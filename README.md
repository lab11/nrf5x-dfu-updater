nRF51x Firmware Uploader
========================

This tool uses BLE to wirelessly reprogram nRF5x based devices.


Quick Start
-----------

    $ sudo npm install -g nrf5x-dfu-updater
    ./nrf5x-dfu-updater -f new-ble-app.bin -a c0:98:e5:11:22:33


BLE Device Setup
----------------

The target device to be reprogrammed must be setup to support the DFU
upload service and have a software bootloader in its flash. To enable
this with the [nrf5x-base](https://github.com/lab11/nrf5x-base),
add

    ENABLE_WIRELESS_DFU=1

to the application Makefile and then reprogram the device.


Notes
-----

Currently only tested with nRF51822.

License
-------

ISC
