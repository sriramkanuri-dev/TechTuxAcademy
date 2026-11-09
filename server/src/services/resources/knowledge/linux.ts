import { cmd, code, diagram, trouble, type ConceptDefinition } from './shared';

export const linuxConcepts: ConceptDefinition[] = [
  {
    id: 'linux-open-source',
    courses: ['linux', 'ubuntu', 'arch', 'rhel', 'open source'],
    topics: ['open source', 'welcome to linux', 'distributions', 'linux matters', 'practice environment'],
    term: 'Linux and the open-source model',
    definition:
      'Linux is a family of open-source operating systems built around the Linux kernel, the GNU userland, and a distribution-specific package manager.',
    paragraphs: [
      'A Linux distribution bundles the kernel with system libraries, command-line tools, a package manager and a desktop or server configuration. Ubuntu, Fedora, Debian, Arch Linux and Red Hat Enterprise Linux share the same kernel model but make different choices about release cadence, package policy and support.',
      'Open source is both a licensing model and a development method. The source code can be inspected, modified and redistributed under licences such as GPL, MIT and Apache-2.0. That transparency is why Linux dominates servers, containers, Android and embedded devices, and why administrators can diagnose problems at every layer of the stack.',
      'The practical consequence is that you own your learning environment. You can install a virtual machine, use Windows Subsystem for Linux, rent a small cloud server, or boot a live USB. Choose one environment and use it consistently: repetition at the shell is what turns commands into intuition.',
    ],
    commands: [
      cmd('System information', 'uname -a', 'Show kernel name, release, architecture and build information.', ['uname -a'], {
        flags: [
          { flag: '-r', description: 'Kernel release only.' },
          { flag: '-m', description: 'Machine hardware architecture.' },
        ],
      }),
      cmd('System information', 'cat /etc/os-release', 'Identify the distribution and version from the standard release file.', ['cat /etc/os-release']),
      cmd('System information', 'lsb_release -a', 'Print distribution description, release and codename when the package is installed.', ['lsb_release -a']),
    ],
    diagram: diagram('layers', 'Linux system layers', 'Applications sit on libraries, which sit on the kernel and hardware.'),
    mistakes: [
      'Assuming every distribution uses the same package manager or configuration file paths.',
      'Copying commands from the internet without understanding whether they are read-only or destructive.',
    ],
    troubleshooting: [
      trouble('A command works in a tutorial but not on your machine.', 'Check the distribution, shell and installed packages first; paths and package names differ between distributions.'),
    ],
  },
  {
    id: 'linux-filesystem-navigation',
    courses: ['linux', 'ubuntu', 'arch', 'rhel'],
    topics: ['filesystem', 'pwd', 'ls', 'cd', 'find', 'tree', 'hierarchy', 'navigating'],
    term: 'The Linux filesystem hierarchy',
    definition:
      'Linux presents one rooted directory tree. Everything, including disks and devices, is mounted somewhere below the root directory /.',
    paragraphs: [
      'The Filesystem Hierarchy Standard gives each top-level directory a purpose. /bin and /usr/bin hold executables, /etc holds system configuration, /var holds changing data such as logs and caches, /home holds user files, /tmp is temporary storage, and /dev exposes devices as files. On modern systems /bin, /sbin and /lib are usually symbolic links into /usr.',
      'Paths are either absolute, starting at /, or relative to the current working directory. The special entries . and .. refer to the current and parent directory. Quoting paths with spaces and using tab completion prevents a large class of avoidable mistakes.',
      'find is the precision tool for locating files by name, type, size, permission or modification time. Prefer find over manually browsing large trees, and always test a destructive action with -print before adding -delete or -exec.',
    ],
    commands: [
      cmd('Navigation', 'pwd', 'Print the absolute path of the current working directory.', ['pwd']),
      cmd('Navigation', 'ls -lah', 'List directory entries with human-readable sizes and hidden files.', ['ls -lah', 'ls -lah /var/log'], {
        flags: [
          { flag: '-l', description: 'Long format with permissions, owner and size.' },
          { flag: '-a', description: 'Include hidden entries beginning with a dot.' },
          { flag: '-h', description: 'Human-readable sizes.' },
        ],
      }),
      cmd('Navigation', 'cd /path/to/directory', 'Change the current working directory.', ['cd /etc', 'cd ..', 'cd ~'], {
        warnings: ['A bare cd returns to your home directory; cd - returns to the previous directory.'],
      }),
      cmd('Search', 'find /path -type f -name "*.log"', 'Search a directory tree for files matching a name pattern.', [
        'find /var/log -type f -name "*.log"',
        'find . -type f -size +100M -print',
      ], {
        flags: [
          { flag: '-type f', description: 'Match regular files only.' },
          { flag: '-name', description: 'Case-sensitive filename pattern.' },
          { flag: '-iname', description: 'Case-insensitive filename pattern.' },
          { flag: '-print', description: 'Print matches before a destructive action.' },
        ],
        warnings: ['Run find with -print first. Adding -delete or -exec rm can remove the wrong files.'],
      }),
      cmd('Search', 'tree -L 2', 'Display a directory tree to a limited depth.', ['tree -L 2', 'tree -d -L 3 /etc'], {
        flags: [{ flag: '-d', description: 'Directories only.' }, { flag: '-L', description: 'Limit depth.' }],
      }),
    ],
    diagram: diagram('filesystem', 'Linux filesystem hierarchy', 'The single rooted tree with the most important top-level directories.'),
    mistakes: [
      'Running rm -rf with an unquoted or mistyped variable, especially when the variable is empty.',
      'Using a relative path after changing directory and assuming it still points at the original location.',
      'Searching the entire filesystem when a narrower path would be faster and safer.',
    ],
    troubleshooting: [
      trouble('Permission denied while reading a file.', 'Inspect ls -l and the parent directory execute bit. Use sudo only when the task genuinely requires root.'),
      trouble('find returns nothing.', 'Check the starting path, quoting of the pattern, and whether the file is on a different mounted filesystem.'),
    ],
  },
  {
    id: 'linux-permissions',
    courses: ['linux', 'ubuntu', 'arch', 'rhel'],
    topics: ['permission', 'chmod', 'chown', 'umask', 'users', 'groups', 'file permissions'],
    term: 'Users, groups and the permission model',
    definition:
      'Every Linux file has an owner, a group and three permission triads controlling read, write and execute access for the owner, the group and everyone else.',
    paragraphs: [
      'Permissions are represented as rwx triads. For a regular file, read allows reading, write allows modification, and execute allows running the file as a program. For a directory, read allows listing names, write allows creating or deleting entries, and execute allows traversing into the directory. A directory without execute permission blocks access even when its contents are readable.',
      'chmod changes the mode. Symbolic notation (u+rw, g-w, o=r) is readable and precise; octal notation (755, 644, 600) is compact. chown changes ownership and requires root for files you do not own. umask subtracts default permissions from newly created files and directories, so a umask of 022 produces 644 files and 755 directories by default.',
      'Special bits matter in production. setuid runs a program with the file owner\'s identity, setgid makes a directory inherit its group, and the sticky bit on a shared directory prevents users from deleting each other\'s files. Use them deliberately and audit them regularly.',
    ],
    commands: [
      cmd('Permissions', 'ls -l', 'Inspect owner, group and permission bits.', ['ls -l', 'ls -ld /shared']),
      cmd('Permissions', 'chmod 640 report.txt', 'Set permissions using octal notation.', ['chmod 640 report.txt', 'chmod 755 deploy.sh', 'chmod u+x script.sh'], {
        syntax: 'chmod [OPTIONS] MODE FILE...',
        flags: [
          { flag: '-R', description: 'Apply recursively to a directory tree.' },
          { flag: '-v', description: 'Report each file processed.' },
        ],
        warnings: ['Avoid chmod -R 777. It grants every user write and execute access and is a security incident waiting to happen.'],
      }),
      cmd('Permissions', 'chown user:group file', 'Change file owner and group.', ['sudo chown deploy:www-data app.log', 'sudo chown -R www-data:www-data /var/www/site'], {
        warnings: ['Recursive ownership changes can break application access. Check the target tree first.'],
      }),
      cmd('Permissions', 'umask', 'Display or set the default permission mask for new files.', ['umask', 'umask 027'], {
        flags: [{ flag: '-S', description: 'Show symbolic notation.' }],
      }),
      cmd('Accounts', 'id', 'Show the current user, primary group and supplementary groups.', ['id', 'id alice']),
      cmd('Accounts', 'groups', 'List the groups a user belongs to.', ['groups', 'groups alice']),
    ],
    diagram: diagram('filesystem', 'Permission triads', 'Owner, group and other permissions are evaluated in order.'),
    mistakes: [
      'Using 777 to "fix" a permission problem instead of diagnosing the missing bit.',
      'Forgetting that a directory needs execute permission for traversal.',
      'Changing ownership recursively on / or on an application directory without checking service accounts.',
    ],
    troubleshooting: [
      trouble('A web server cannot read an uploaded file.', 'Check every directory in the path, the file mode, the service account and SELinux or AppArmor labels.'),
      trouble('chmod appears to succeed but access is still denied.', 'Look for ACLs with getfacl, immutable attributes with lsattr, and mandatory access control denials in the audit log.'),
    ],
  },
  {
    id: 'linux-processes-systemd',
    courses: ['linux', 'ubuntu', 'arch', 'rhel'],
    topics: ['process', 'signal', 'systemd', 'ps', 'top', 'systemctl', 'service'],
    term: 'Processes, signals and systemd',
    definition:
      'A process is a running program with its own memory, file descriptors and identity. Signals are asynchronous notifications used to request termination, reload or other behaviour.',
    paragraphs: [
      'The kernel schedules processes and gives each one a PID, a parent PID, a user identity and a state. ps shows a snapshot; top or htop shows a live view of CPU and memory use. Load average counts runnable and uninterruptible tasks, so a high value can mean CPU contention or blocked I/O rather than simply "too much CPU".',
      'Signals are not all equal. SIGTERM asks a process to exit cleanly and is the default for kill. SIGINT is what Ctrl+C sends. SIGKILL cannot be caught or ignored, so it should be a last resort because the process cannot flush buffers or remove temporary files. SIGHUP traditionally means hang up, but many daemons use it to reload configuration.',
      'systemd is the service manager on most modern distributions. A unit file declares how a service starts, stops, restarts and logs. systemctl start, stop, restart, enable and status are the daily commands; journalctl reads the logs. enable controls boot-time activation, while start only affects the current boot.',
    ],
    commands: [
      cmd('Processes', 'ps aux', 'Show every process with user, PID, CPU, memory and command.', ['ps aux', 'ps aux | grep nginx'], {
        flags: [{ flag: 'aux', description: 'All users, user-oriented format, include processes without a terminal.' }],
      }),
      cmd('Processes', 'top', 'Display a live, sorted process and resource view.', ['top', 'top -o %MEM'], {
        flags: [{ flag: '-o', description: 'Sort by a field such as %CPU or %MEM.' }],
      }),
      cmd('Processes', 'kill -TERM PID', 'Send SIGTERM to request a clean shutdown.', ['kill -TERM 4242', 'kill -HUP 4242'], {
        warnings: ['Use kill -KILL only after a graceful shutdown has failed; it prevents cleanup.'],
      }),
      cmd('systemd', 'systemctl status nginx', 'Show whether a service is active and its recent log lines.', ['systemctl status nginx', 'systemctl is-enabled nginx']),
      cmd('systemd', 'systemctl restart nginx', 'Restart a service and apply configuration changes.', ['sudo systemctl restart nginx'], {
        warnings: ['Restarting a production service can drop connections. Prefer reload when the service supports it.'],
      }),
      cmd('systemd', 'journalctl -u nginx -n 100', 'Read the last 100 log lines for a systemd unit.', ['journalctl -u nginx -n 100', 'journalctl -u nginx -f'], {
        flags: [{ flag: '-u', description: 'Filter by unit.' }, { flag: '-f', description: 'Follow new entries.' }, { flag: '-n', description: 'Number of lines.' }],
      }),
    ],
    diagram: diagram('flow', 'Process lifecycle', 'Created, runnable, running, waiting, stopped and terminated states.'),
    mistakes: [
      'Jumping straight to kill -9 instead of reading logs and trying SIGTERM.',
      'Confusing systemctl enable with systemctl start.',
      'Killing a parent process and assuming its children will always terminate cleanly.',
    ],
    troubleshooting: [
      trouble('A service starts manually but not at boot.', 'Check systemctl is-enabled, the unit file WantedBy target, and journalctl for dependency or permission errors.'),
      trouble('High load average but low CPU usage.', 'Look for processes in uninterruptible I/O wait with ps and inspect disk or network latency.'),
    ],
  },
  {
    id: 'linux-package-management',
    courses: ['linux', 'ubuntu', 'arch', 'rhel'],
    topics: ['package management', 'apt', 'dnf', 'pacman', 'repositories', 'updates'],
    term: 'Package management across distributions',
    definition:
      'A package manager resolves dependencies, verifies signatures and installs, upgrades or removes software from configured repositories.',
    paragraphs: [
      'Debian and Ubuntu use APT with .deb packages. RHEL, Fedora and Rocky use DNF with RPM packages. Arch uses pacman and the Arch User Repository. The commands differ, but the concepts are the same: refresh repository metadata, search, install, upgrade, remove and inspect package ownership.',
      'Prefer distribution packages for system software because they receive security updates and integrate with the service manager. Use language-specific package managers such as pip, npm or cargo for application dependencies, and keep those dependencies inside a project-local environment.',
      'Before a large upgrade, read the distribution release notes, take a backup, and make sure you have console access. On servers, update regularly in a maintenance window and reboot when the kernel or core libraries change.',
    ],
    commands: [
      cmd('Debian/Ubuntu packages', 'apt update', 'Refresh the package index from configured repositories.', ['sudo apt update'], {
        warnings: ['apt update only refreshes metadata. It does not upgrade installed packages.'],
      }),
      cmd('Debian/Ubuntu packages', 'apt install nginx', 'Install a package and its dependencies.', ['sudo apt install nginx', 'sudo apt install --no-install-recommends nginx'], {
        flags: [{ flag: '--no-install-recommends', description: 'Install only required dependencies.' }],
      }),
      cmd('Debian/Ubuntu packages', 'apt upgrade', 'Upgrade installed packages without removing packages.', ['sudo apt upgrade', 'sudo apt full-upgrade'], {
        warnings: ['full-upgrade may remove or add packages to resolve dependencies. Review the summary before confirming.'],
      }),
      cmd('RHEL/Fedora packages', 'dnf install httpd', 'Install an RPM package with dependency resolution.', ['sudo dnf install httpd', 'sudo dnf update'], {
        flags: [{ flag: 'search', description: 'Search package names and summaries.' }, { flag: 'info', description: 'Show package details.' }],
      }),
      cmd('Arch packages', 'pacman -Syu', 'Synchronise repositories and perform a full system upgrade.', ['sudo pacman -Syu', 'sudo pacman -S git'], {
        warnings: ['Arch does not support partial upgrades. Always use -Syu, not -Sy alone, before installing packages.'],
      }),
      cmd('Package inspection', 'dpkg -S /usr/bin/curl', 'Find which Debian package owns a file.', ['dpkg -S /usr/bin/curl']),
      cmd('Package inspection', 'rpm -qf /usr/bin/curl', 'Find which RPM package owns a file.', ['rpm -qf /usr/bin/curl']),
    ],
    diagram: diagram('pipeline', 'Package installation pipeline', 'Repository metadata, dependency resolution, download, signature check and installation.'),
    mistakes: [
      'Mixing packages from unrelated repositories without checking compatibility.',
      'Running a partial Arch upgrade with pacman -Sy package instead of a full -Syu.',
      'Using pip install as root to modify system Python packages.',
    ],
    troubleshooting: [
      trouble('apt reports held packages or unmet dependencies.', 'Read the full output, check apt policy for the package, and resolve the repository or version conflict before forcing anything.'),
      trouble('A command is missing after installation.', 'Check PATH, the package file list, and whether the binary is in /usr/sbin or /usr/local/bin.'),
    ],
  },
  {
    id: 'linux-networking',
    courses: ['linux', 'ubuntu', 'arch', 'rhel'],
    topics: ['networking', 'ip', 'ss', 'curl', 'route', 'socket', 'connectivity', 'http'],
    term: 'Linux networking from the terminal',
    definition:
      'Linux networking is configured through interfaces, addresses, routes, DNS resolvers, sockets and firewall rules, all inspectable from user space.',
    paragraphs: [
      'An interface is a network device such as eth0, enp3s0 or wlan0. An address gives it an IP identity; a route tells the kernel where to send packets. The default route is the gateway used when no more specific route matches. DNS translates names into addresses and is configured in /etc/resolv.conf or by a resolver service.',
      'ss replaces netstat for inspecting sockets. It shows listening TCP ports, established connections and UNIX domain sockets. curl is the quickest way to test HTTP from the client side: it exposes status codes, headers, redirects, TLS details and timing.',
      'When connectivity fails, work outward: link state, IP address, route, DNS, TCP port, TLS and application response. Test each layer with the smallest command that answers the question instead of guessing.',
    ],
    commands: [
      cmd('Interfaces', 'ip addr show', 'Show interfaces and assigned IP addresses.', ['ip addr show', 'ip -brief addr']),
      cmd('Routing', 'ip route show', 'Display the kernel routing table and default gateway.', ['ip route show', 'ip route get 1.1.1.1']),
      cmd('Sockets', 'ss -tulpn', 'List listening TCP and UDP sockets with process names.', ['ss -tulpn', 'ss -tan state established'], {
        flags: [{ flag: '-t', description: 'TCP sockets.' }, { flag: '-u', description: 'UDP sockets.' }, { flag: '-l', description: 'Listening sockets.' }, { flag: '-p', description: 'Show process.' }, { flag: '-n', description: 'Numeric ports.' }],
      }),
      cmd('HTTP', 'curl -I https://example.com', 'Fetch response headers only.', ['curl -I https://example.com', 'curl -v https://example.com'], {
        flags: [{ flag: '-I', description: 'HEAD request, headers only.' }, { flag: '-v', description: 'Verbose request and TLS details.' }, { flag: '-L', description: 'Follow redirects.' }],
      }),
      cmd('DNS', 'dig example.com', 'Query DNS records and inspect the resolver response.', ['dig example.com', 'dig +short A example.com'], {
        warnings: ['If dig is not installed, install bind-utils or dnsutils; do not assume DNS is broken because one tool is missing.'],
      }),
      cmd('Connectivity', 'ping -c 4 1.1.1.1', 'Test ICMP reachability and round-trip time.', ['ping -c 4 1.1.1.1'], {
        warnings: ['ICMP may be blocked while TCP services still work. A failed ping is not proof that the host is down.'],
      }),
    ],
    diagram: diagram('network', 'Network troubleshooting path', 'Link, address, route, DNS, port, TLS and application layers.'),
    mistakes: [
      'Testing only with ping and concluding a web service is down.',
      'Editing DNS by hand while a resolver service overwrites the file.',
      'Opening a firewall port without confirming which process is listening.',
    ],
    troubleshooting: [
      trouble('curl works by IP but not by hostname.', 'Test DNS with dig, inspect /etc/resolv.conf and the systemd-resolved configuration.'),
      trouble('Connection refused on a local service.', 'Check ss -tulpn, the bind address, the service status and the firewall.'),
    ],
  },
  {
    id: 'arch-install-media',
    courses: ['arch'],
    topics: ['arch way', 'installation media', 'bootable usb', 'preparing installation'],
    term: 'The Arch Way and installation media',
    definition:
      'Arch Linux is a rolling-release, minimal distribution that expects the administrator to assemble the system from documented components.',
    paragraphs: [
      'The Arch Way values simplicity, modernity, pragmatism, user centrality and versatility. "Simple" means without unnecessary abstraction, not necessarily easy: you choose the bootloader, filesystem, desktop and services. The Arch Wiki is the primary reference and should be read alongside any tutorial.',
      'Installation begins with verified installation media. Download the ISO, verify its signature, write it to a USB device with dd or a dedicated tool, and boot the target machine in UEFI mode when the hardware supports it. Confirm the boot mode before partitioning because the partitioning scheme depends on it.',
      'A network connection is required during installation. Use a wired connection, iwctl for Wi-Fi, or a USB tether. Check the clock and mirror list before downloading packages so signatures and timestamps validate correctly.',
    ],
    commands: [
      cmd('Install media', 'dd if=archlinux.iso of=/dev/sdX bs=4M status=progress oflag=sync', 'Write an ISO image to a USB block device.', ['sudo dd if=archlinux.iso of=/dev/sdX bs=4M status=progress oflag=sync'], {
        warnings: ['Double-check the target device with lsblk. Writing to the wrong device destroys its data.'],
      }),
      cmd('Verification', 'sha256sum archlinux.iso', 'Verify the downloaded ISO checksum against the published value.', ['sha256sum archlinux.iso']),
      cmd('UEFI check', 'ls /sys/firmware/efi/efivars', 'Confirm the live environment booted in UEFI mode.', ['ls /sys/firmware/efi/efivars'], {
        warnings: ['If the directory does not exist, you are likely in BIOS/legacy mode; partitioning and bootloader instructions differ.'],
      }),
      cmd('Network', 'ip link', 'List network interfaces before connecting.', ['ip link', 'iwctl']),
      cmd('Time', 'timedatectl set-ntp true', 'Enable network time synchronisation.', ['timedatectl set-ntp true', 'timedatectl status']),
    ],
    diagram: diagram('pipeline', 'Arch installation phases', 'Boot media, network, partitioning, pacstrap, chroot, bootloader, reboot.'),
    mistakes: [
      'Writing the ISO to a partition instead of the whole block device.',
      'Skipping checksum or signature verification.',
      'Following a BIOS-era guide on a UEFI system.',
    ],
    troubleshooting: [
      trouble('The USB does not appear in the boot menu.', 'Recreate the media, check the firmware boot mode and disable secure boot only if the media requires it.'),
      trouble('Wi-Fi is unavailable in the live environment.', 'Use iwctl, check rfkill, and confirm the wireless firmware is present.'),
    ],
  },
  {
    id: 'arch-partitioning-luks',
    courses: ['arch'],
    topics: ['partition', 'luks', 'gpt', 'efi', 'encryption', 'mounting'],
    term: 'GPT partitioning and LUKS2 encryption',
    definition:
      'GPT is the modern partition table format. LUKS2 is the Linux disk-encryption specification that wraps a block device in an encrypted mapping.',
    paragraphs: [
      'A UEFI system needs an EFI System Partition formatted as FAT32 and mounted at /boot or /efi. The rest of the disk can be divided into a root partition and optionally a swap or home partition. GPT stores primary and backup headers, so a damaged primary header can sometimes be recovered from the backup.',
      'LUKS2 encrypts a block device with a passphrase or key file. After unlocking, the decrypted mapping appears as /dev/mapper/cryptroot, which is then formatted with a normal filesystem. Encryption protects data at rest when the machine is powered off; it does not protect a running, unlocked system.',
      'Keep a recovery plan: a second LUKS key slot, a securely stored header backup, and a tested rescue environment. Losing every key slot means the data is unrecoverable.',
    ],
    commands: [
      cmd('Partitioning', 'lsblk -f', 'Show block devices, filesystems, labels and mount points.', ['lsblk -f', 'lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS']),
      cmd('Partitioning', 'parted /dev/nvme0n1', 'Create and inspect GPT partitions interactively.', ['sudo parted /dev/nvme0n1', 'sudo parted /dev/nvme0n1 print'], {
        warnings: ['Partition changes can destroy data. Confirm the device name and take a backup first.'],
      }),
      cmd('Filesystems', 'mkfs.fat -F32 /dev/nvme0n1p1', 'Format the EFI System Partition as FAT32.', ['sudo mkfs.fat -F32 /dev/nvme0n1p1']),
      cmd('LUKS', 'cryptsetup luksFormat /dev/nvme0n1p2', 'Initialise a LUKS2 encrypted container.', ['sudo cryptsetup luksFormat /dev/nvme0n1p2'], {
        warnings: ['luksFormat erases the partition. Verify the target device and have a recovery key plan.'],
      }),
      cmd('LUKS', 'cryptsetup open /dev/nvme0n1p2 cryptroot', 'Unlock a LUKS container and create a device-mapper mapping.', ['sudo cryptsetup open /dev/nvme0n1p2 cryptroot', 'ls /dev/mapper/']),
      cmd('Filesystems', 'mkfs.ext4 /dev/mapper/cryptroot', 'Create an ext4 filesystem on the unlocked mapping.', ['sudo mkfs.ext4 /dev/mapper/cryptroot']),
      cmd('Mounting', 'mount /dev/mapper/cryptroot /mnt', 'Mount the new root filesystem for installation.', ['sudo mount /dev/mapper/cryptroot /mnt', 'sudo mount /dev/nvme0n1p1 /mnt/boot']),
    ],
    diagram: diagram('layers', 'LUKS encryption stack', 'Filesystem on a device-mapper mapping on an encrypted block device.'),
    mistakes: [
      'Formatting the whole disk instead of the intended partition.',
      'Forgetting to mount the EFI partition before installing the bootloader.',
      'Storing the only LUKS passphrase in a place that depends on the encrypted disk.',
    ],
    troubleshooting: [
      trouble('cryptsetup open says the device is already in use.', 'Check lsblk and /dev/mapper, close the existing mapping with cryptsetup close, and verify no filesystem is mounted.'),
      trouble('The system drops to an emergency shell after reboot.', 'Check /etc/crypttab, the initramfs hooks and the kernel command line; the root mapping may not be unlocked early enough.'),
    ],
  },
  {
    id: 'arch-pacstrap-chroot',
    courses: ['arch'],
    topics: ['pacstrap', 'fstab', 'chroot', 'arch-chroot', 'base system'],
    term: 'pacstrap, fstab and arch-chroot',
    definition:
      'pacstrap installs the base system into a mounted target. genfstab records mounts, and arch-chroot enters the new system with the live environment\'s resources available.',
    paragraphs: [
      'After mounting the target filesystems, pacstrap installs the base package group, the kernel and firmware into /mnt. The exact package set is a design decision: a minimal server does not need a desktop, and a desktop needs graphics drivers and a display server.',
      'genfstab reads the current mount table and writes /etc/fstab. Use UUIDs or PARTUUIDs rather than kernel device names because device names can change. Verify the generated file before rebooting; an incorrect root entry produces an unbootable system.',
      'arch-chroot changes the apparent root to the new system and mounts /proc, /sys, /dev and /run. Inside the chroot you set the time zone, locale, hostname, root password, users, initramfs and bootloader. Exit and unmount everything before rebooting.',
    ],
    commands: [
      cmd('Installation', 'pacstrap -K /mnt base linux linux-firmware', 'Install the base system, kernel and firmware into the target.', ['pacstrap -K /mnt base linux linux-firmware'], {
        warnings: ['The target must be mounted at /mnt first. Confirm with findmnt before running.'],
      }),
      cmd('Mounts', 'genfstab -U /mnt >> /mnt/etc/fstab', 'Generate fstab entries using filesystem UUIDs.', ['genfstab -U /mnt >> /mnt/etc/fstab', 'cat /mnt/etc/fstab']),
      cmd('Chroot', 'arch-chroot /mnt', 'Enter the new system with a working pseudo-filesystem environment.', ['arch-chroot /mnt']),
      cmd('Locale', 'locale-gen', 'Generate locales declared in /etc/locale.gen.', ['locale-gen']),
      cmd('Initramfs', 'mkinitcpio -P', 'Regenerate all initramfs images.', ['mkinitcpio -P'], {
        warnings: ['Regenerate after changing hooks, kernel modules or encryption configuration.'],
      }),
      cmd('Accounts', 'passwd', 'Set a password for the current account.', ['passwd', 'passwd alice']),
    ],
    diagram: diagram('flow', 'Arch install chroot workflow', 'Mount, pacstrap, fstab, chroot, configure, bootloader, unmount, reboot.'),
    mistakes: [
      'Rebooting before installing a bootloader.',
      'Editing fstab with the wrong UUID or mount options.',
      'Leaving the live USB mounted at /mnt/boot and then unmounting it in the wrong order.',
    ],
    troubleshooting: [
      trouble('arch-chroot fails with "failed to setup chroot".', 'Confirm the root filesystem is mounted at /mnt and that /mnt is a directory, not a file.'),
      trouble('Boot fails with "unknown filesystem" or a root UUID error.', 'Compare blkid output with /etc/fstab and the kernel command line.'),
    ],
  },
  {
    id: 'arch-boot-kernel',
    courses: ['arch'],
    topics: ['bootloader', 'kernel', 'microcode', 'systemd-boot', 'initramfs', 'kernel options'],
    term: 'Bootloaders, kernels and early microcode',
    definition:
      'The bootloader loads the kernel and initramfs. The kernel initialises hardware and mounts the real root filesystem, optionally using early microcode updates.',
    paragraphs: [
      'systemd-boot is a simple UEFI boot manager that reads loader entries from the EFI System Partition. GRUB is more flexible and supports BIOS and UEFI, but has a larger configuration surface. Choose one, install it to the correct location, and test both normal boot and fallback entries.',
      'The initramfs is a small temporary filesystem containing the modules and tools needed to mount the real root. For LUKS, the encrypt hook must be present; for LVM, the lvm2 hook; for RAID, the mdadm hook. mkinitcpio builds it from /etc/mkinitcpio.conf.',
      'CPU microcode updates fix hardware-level errata. Install the intel-ucode or amd-ucode package and add it to the bootloader configuration so it loads as early as possible. Keep a known-good kernel installed so a regression does not leave you without a bootable system.',
    ],
    commands: [
      cmd('Bootloader', 'bootctl install', 'Install systemd-boot to the EFI System Partition.', ['sudo bootctl install', 'bootctl status'], {
        warnings: ['The EFI partition must be mounted at /boot or /efi and the system must be booted in UEFI mode.'],
      }),
      cmd('Bootloader', 'bootctl update', 'Update the systemd-boot binary on the EFI partition.', ['sudo bootctl update']),
      cmd('Initramfs', 'mkinitcpio -P', 'Rebuild initramfs images after configuration changes.', ['sudo mkinitcpio -P']),
      cmd('Kernel', 'uname -r', 'Show the running kernel release.', ['uname -r']),
      cmd('Microcode', 'pacman -S intel-ucode', 'Install Intel CPU microcode updates.', ['sudo pacman -S intel-ucode', 'sudo pacman -S amd-ucode']),
    ],
    diagram: diagram('layers', 'Boot sequence', 'Firmware, bootloader, kernel, initramfs, init/systemd, user space.'),
    mistakes: [
      'Installing a bootloader without mounting the EFI partition.',
      'Removing the fallback initramfs and then breaking the primary image.',
      'Forgetting the encrypt hook in mkinitcpio.conf after enabling LUKS.',
    ],
    troubleshooting: [
      trouble('The boot menu does not appear.', 'Check the firmware boot order, the EFI partition contents, and whether the bootloader was installed in UEFI mode.'),
      trouble('The system hangs at "Waiting for root device".', 'Verify the root UUID, initramfs hooks and storage drivers.'),
    ],
  },
  {
    id: 'arch-desktop-maintenance',
    courses: ['arch'],
    topics: ['desktop', 'audio', 'pipewire', 'daily maintenance', 'post-install'],
    term: 'Desktop, audio and rolling-release maintenance',
    definition:
      'A practical Arch desktop combines a display server, a desktop environment or window manager, audio, networking and a disciplined update routine.',
    paragraphs: [
      'Install graphics drivers appropriate to the hardware, then a display server such as Wayland or Xorg, then a desktop environment or window manager. Keep the stack minimal until it works, and add components one at a time so failures are easy to isolate.',
      'PipeWire has become the default audio and video router on modern Linux desktops. It provides PulseAudio and JACK compatibility while handling Bluetooth audio and screen sharing. Check user services with systemctl --user status pipewire and wireplumber.',
      'Arch is rolling-release, so maintenance is continuous. Read the Arch news before large upgrades, update regularly, reboot after kernel or core library changes, and keep a backup of configuration files. Use pacman -Qtdq to find orphaned dependencies and pacman -Sc to clean the package cache deliberately.',
    ],
    commands: [
      cmd('Desktop', 'systemctl --user status pipewire', 'Check the user-level PipeWire service.', ['systemctl --user status pipewire', 'systemctl --user status wireplumber']),
      cmd('Packages', 'pacman -Syu', 'Perform a full system upgrade.', ['sudo pacman -Syu']),
      cmd('Packages', 'pacman -Qtdq', 'List orphaned packages that are no longer required.', ['pacman -Qtdq', 'sudo pacman -Rns $(pacman -Qtdq)'], {
        warnings: ['Review the list before removing orphans; a package may be intentionally installed as a dependency of something outside pacman.'],
      }),
      cmd('Packages', 'pacman -Sc', 'Clean cached packages that are no longer installed.', ['sudo pacman -Sc'], {
        warnings: ['Cleaning the cache prevents downgrading to a previously working package version. Keep the cache if you value rollback options.'],
      }),
      cmd('Logs', 'journalctl -p 3 -xb', 'Show priority-3 and higher messages from the current boot.', ['journalctl -p 3 -xb']),
    ],
    diagram: diagram('layers', 'Desktop stack', 'Hardware, kernel drivers, display server, desktop environment and applications.'),
    mistakes: [
      'Upgrading only one package on a rolling-release system.',
      'Ignoring Arch news before a major transition.',
      'Removing the package cache and losing the ability to downgrade.',
    ],
    troubleshooting: [
      trouble('No audio after an update.', 'Check user services, wireplumber, the default sink with wpctl status, and whether the kernel module loaded.'),
      trouble('The desktop fails to start after a driver update.', 'Boot a fallback kernel or TTY, read journalctl, and downgrade the driver from the package cache if necessary.'),
    ],
  },
  {
    id: 'rhel-subscription',
    courses: ['rhel', 'red hat'],
    topics: ['rhel architecture', 'subscription', 'release stream', 'repository', 'registration'],
    term: 'RHEL architecture and subscriptions',
    definition:
      'Red Hat Enterprise Linux is a commercially supported distribution with defined release streams, subscription-based repositories and a predictable lifecycle.',
    paragraphs: [
      'RHEL major versions are supported for years with minor releases that add hardware support and features while preserving application compatibility. Minor releases are delivered as a new installation tree and as updated packages; the system records which minor stream it follows.',
      'A subscription entitles the system to repositories, support and updates. subscription-manager registers the system, attaches a subscription and enables the appropriate repositories. Without a valid subscription, dnf cannot access the supported content sets.',
      'Keep the base OS and application streams deliberate. Module streams let one system access multiple versions of a runtime, but enabling a stream is a compatibility decision that should be documented and tested.',
    ],
    commands: [
      cmd('Subscriptions', 'subscription-manager register --username USER', 'Register the system with Red Hat subscription services.', ['sudo subscription-manager register --username user@example.com'], {
        warnings: ['Use a service account or activation key for automation; avoid embedding personal passwords in scripts.'],
      }),
      cmd('Subscriptions', 'subscription-manager status', 'Check overall subscription and entitlement status.', ['sudo subscription-manager status']),
      cmd('Repositories', 'dnf repolist --all', 'List enabled and disabled repositories.', ['dnf repolist --all', 'dnf repolist --enabled']),
      cmd('System', 'cat /etc/redhat-release', 'Show the RHEL release version.', ['cat /etc/redhat-release']),
      cmd('Modules', 'dnf module list', 'List available module streams.', ['dnf module list', 'dnf module enable nodejs:20']),
    ],
    diagram: diagram('pipeline', 'RHEL lifecycle', 'Registration, repositories, minor releases, extended support and lifecycle end.'),
    mistakes: [
      'Assuming CentOS Stream, Rocky Linux and RHEL have identical support and repository behaviour.',
      'Enabling module streams without checking application compatibility.',
      'Registering production systems with personal credentials instead of organisational activation keys.',
    ],
    troubleshooting: [
      trouble('dnf cannot find a package.', 'Check subscription-manager status, enabled repositories and whether the package is in a module stream or an optional repository.'),
      trouble('The system is registered but updates fail.', 'Verify the system date, subscription entitlement and network access to the Red Hat CDN.'),
    ],
  },
  {
    id: 'rhel-sudo-pam',
    courses: ['rhel', 'red hat'],
    topics: ['sudo', 'pam', 'users', 'account management', 'privilege', 'passwd'],
    term: 'Users, sudo and PAM',
    definition:
      'PAM provides pluggable authentication and account policies. sudo delegates specific privileged commands while recording who ran what.',
    paragraphs: [
      'Linux accounts have a UID, a primary group, supplementary groups, a home directory and a login shell. Service accounts should be non-login accounts with the minimum privileges required. Use useradd, usermod and userdel with explicit options rather than editing /etc/passwd by hand.',
      'sudo is configured in /etc/sudoers and files under /etc/sudoers.d. Always edit with visudo so syntax is checked before the file is saved. Grant specific commands or command groups, not unrestricted ALL access, unless the role genuinely requires it.',
      'PAM stacks in /etc/pam.d control authentication, account validity, password changes and session setup. Password quality, lockout, MFA and access time restrictions are all implemented as PAM modules. A broken PAM configuration can lock every user out, so keep a root console available and test changes carefully.',
    ],
    commands: [
      cmd('Accounts', 'useradd -m -s /bin/bash alice', 'Create a user with a home directory and login shell.', ['sudo useradd -m -s /bin/bash alice'], {
        flags: [{ flag: '-m', description: 'Create the home directory.' }, { flag: '-s', description: 'Set the login shell.' }, { flag: '-G', description: 'Add supplementary groups.' }],
      }),
      cmd('Accounts', 'passwd alice', 'Set or change a user password.', ['sudo passwd alice'], {
        warnings: ['Avoid passing passwords on the command line; they leak into shell history and process listings.'],
      }),
      cmd('Privilege', 'visudo -c', 'Validate the sudoers configuration syntax.', ['sudo visudo -c']),
      cmd('Privilege', 'sudo -l -U alice', 'List the sudo privileges granted to a user.', ['sudo -l -U alice']),
      cmd('PAM', 'authselect list', 'List available PAM and authentication profiles on RHEL.', ['authselect list', 'authselect select sssd']),
      cmd('Sessions', 'last', 'Show recent login history from wtmp.', ['last', 'last -n 20']),
    ],
    diagram: diagram('flow', 'PAM authentication flow', 'Application, PAM service stack, modules, account and session checks.'),
    mistakes: [
      'Editing /etc/sudoers directly instead of using visudo.',
      'Granting NOPASSWD: ALL to broad groups.',
      'Changing PAM without testing in a second root session.',
    ],
    troubleshooting: [
      trouble('sudo reports a syntax error and refuses all commands.', 'Use pkexec or a root console to run visudo, fix the file, and validate with visudo -c.'),
      trouble('A user can authenticate but cannot log in.', 'Check the account and session PAM modules, shell validity, home directory permissions and account expiry.'),
    ],
  },
  {
    id: 'rhel-storage-lvm',
    courses: ['rhel', 'red hat', 'linux'],
    topics: ['storage', 'lvm', 'logical volume', 'filesystem', 'mount', 'fstab', 'xfs'],
    term: 'Storage, LVM and filesystems',
    definition:
      'LVM pools physical storage into volume groups and carves logical volumes from them, making resizing and snapshots far easier than fixed partitions.',
    paragraphs: [
      'The LVM stack has three layers: physical volumes (PVs) on disks or partitions, volume groups (VGs) that pool capacity, and logical volumes (LVs) that are formatted with a filesystem. A filesystem such as XFS or ext4 sits on top of an LV and is mounted into the directory tree.',
      'XFS is the default on RHEL and grows online but does not shrink. ext4 can grow and shrink offline. Understand the filesystem before promising a resize. Always back up data and check free space in the volume group before extending an LV.',
      'Persistent mounts belong in /etc/fstab and should use UUIDs or LVM device paths. Test with mount -a before rebooting. For network or non-critical mounts, use the nofail and x-systemd.automount options so a missing device does not block boot.',
    ],
    commands: [
      cmd('LVM', 'pvs', 'Show physical volume information.', ['sudo pvs', 'sudo pvdisplay']),
      cmd('LVM', 'vgs', 'Show volume group capacity and free space.', ['sudo vgs']),
      cmd('LVM', 'lvs', 'Show logical volumes and their sizes.', ['sudo lvs']),
      cmd('LVM', 'lvcreate -L 20G -n appdata vg_data', 'Create a 20 GiB logical volume.', ['sudo lvcreate -L 20G -n appdata vg_data'], {
        warnings: ['Confirm the volume group name and free capacity with vgs first.'],
      }),
      cmd('Filesystems', 'mkfs.xfs /dev/vg_data/appdata', 'Create an XFS filesystem on a logical volume.', ['sudo mkfs.xfs /dev/vg_data/appdata'], {
        warnings: ['mkfs destroys existing data on the target device.'],
      }),
      cmd('Mounts', 'mount /dev/vg_data/appdata /srv/appdata', 'Mount a filesystem for the current boot.', ['sudo mount /dev/vg_data/appdata /srv/appdata']),
      cmd('Mounts', 'findmnt --verify', 'Validate fstab entries before rebooting.', ['sudo findmnt --verify']),
      cmd('LVM', 'lvextend -r -L +10G /dev/vg_data/appdata', 'Extend a logical volume and grow the filesystem in one step.', ['sudo lvextend -r -L +10G /dev/vg_data/appdata'], {
        warnings: ['The -r option resizes supported filesystems. Verify the filesystem type and backup first.'],
      }),
    ],
    diagram: diagram('layers', 'LVM stack', 'Physical volumes, volume group, logical volumes and filesystems.'),
    mistakes: [
      'Extending an LV without extending the filesystem inside it.',
      'Using device names in fstab instead of UUIDs or stable LVM paths.',
      'Shrinking XFS, which is not supported.',
    ],
    troubleshooting: [
      trouble('The system boots into emergency mode after an fstab change.', 'Boot with the emergency shell, comment out the bad entry, or add nofail, then run findmnt --verify.'),
      trouble('lvextend succeeds but df shows no extra space.', 'Grow the filesystem with xfs_growfs or resize2fs, or use lvextend -r.'),
    ],
  },
  {
    id: 'rhel-selinux',
    courses: ['rhel', 'red hat'],
    topics: ['selinux', 'context', 'boolean', 'audit', 'denial'],
    term: 'SELinux contexts, booleans and audit logs',
    definition:
      'SELinux is a mandatory access control system that labels processes and files with security contexts and enforces policy between them.',
    paragraphs: [
      'A context has a user, role, type and sensitivity level. Most everyday policy decisions are about the type, such as httpd_t for the web server and httpd_sys_content_t for files it may read. Standard UNIX permissions are checked as well, but SELinux can deny access even when rwx bits allow it.',
      'Booleans toggle optional policy behaviour without writing custom policy. For example, httpd_can_network_connect allows the web server to make outbound network connections. Use semanage boolean -l to inspect and setsebool -P to persist a change.',
      'When access is denied, read the audit log instead of disabling SELinux. ausearch and sealert identify the source and target types and often suggest a targeted fix. Disabling SELinux to solve one denial weakens the whole system and hides the real misconfiguration.',
    ],
    commands: [
      cmd('SELinux', 'getenforce', 'Show the current SELinux mode.', ['getenforce']),
      cmd('SELinux', 'sestatus', 'Show mode, policy and loaded configuration.', ['sestatus']),
      cmd('SELinux', 'ls -Z /var/www/html', 'Show SELinux contexts for files.', ['ls -Z /var/www/html']),
      cmd('SELinux', 'restorecon -Rv /var/www/html', 'Restore files to their default SELinux contexts.', ['sudo restorecon -Rv /var/www/html']),
      cmd('SELinux', 'semanage fcontext -a -t httpd_sys_content_t "/srv/site(/.*)?"', 'Add a persistent file-context rule.', ['sudo semanage fcontext -a -t httpd_sys_content_t "/srv/site(/.*)?"'], {
        warnings: ['After changing fcontext rules, run restorecon so existing files receive the new label.'],
      }),
      cmd('SELinux', 'getsebool -a | grep httpd', 'List booleans related to the web server.', ['getsebool -a | grep httpd']),
      cmd('SELinux', 'setsebool -P httpd_can_network_connect on', 'Persistently enable a policy boolean.', ['sudo setsebool -P httpd_can_network_connect on']),
      cmd('Audit', 'ausearch -m avc -ts recent', 'Search recent SELinux access vector denials.', ['sudo ausearch -m avc -ts recent']),
    ],
    diagram: diagram('flow', 'SELinux decision flow', 'Subject context, object context, policy lookup, allow or deny, audit record.'),
    mistakes: [
      'Setting SELinux to permissive or disabled instead of fixing the label or boolean.',
      'Copying files into a web root without running restorecon.',
      'Assuming chmod is enough when SELinux is enforcing.',
    ],
    troubleshooting: [
      trouble('The web server returns 403 for files that have correct UNIX permissions.', 'Check ls -Z, restorecon the files, and search ausearch for AVC denials.'),
      trouble('A custom application cannot bind to a port.', 'Check semanage port -l and add the port to the correct SELinux type if policy allows it.'),
    ],
  },
  {
    id: 'rhel-firewalld',
    courses: ['rhel', 'red hat', 'ubuntu', 'linux'],
    topics: ['firewalld', 'firewall', 'networking', 'connectivity', 'ports', 'ufw'],
    term: 'Firewalld, networking and connectivity troubleshooting',
    definition:
      'Firewalld manages firewall rules through zones and services. Zones describe trust levels; services describe ports and protocols.',
    paragraphs: [
      'A zone is attached to an interface or source network. The default zone applies when no more specific match exists. Services such as http and https expand to the correct ports and protocols, which is safer and more readable than opening raw port numbers.',
      'Runtime changes disappear on reload unless made permanent. Use firewall-cmd --permanent followed by firewall-cmd --reload, or make the change in runtime and then copy it to permanent configuration. Always verify with --list-all.',
      'Connectivity troubleshooting is layered: interface and address, route, DNS, listening socket, firewall, then application. Firewalld only matters once a packet reaches the host; a service that is not listening cannot be fixed by opening a port.',
    ],
    commands: [
      cmd('Firewalld', 'firewall-cmd --state', 'Show whether firewalld is running.', ['sudo firewall-cmd --state']),
      cmd('Firewalld', 'firewall-cmd --get-active-zones', 'Show zones and the interfaces or sources assigned to them.', ['sudo firewall-cmd --get-active-zones']),
      cmd('Firewalld', 'firewall-cmd --list-all', 'List services, ports and rules in the default zone.', ['sudo firewall-cmd --list-all']),
      cmd('Firewalld', 'firewall-cmd --permanent --add-service=https', 'Permanently allow HTTPS in the default zone.', ['sudo firewall-cmd --permanent --add-service=https', 'sudo firewall-cmd --reload'], {
        warnings: ['Permanent changes do not take effect until you reload firewalld.'],
      }),
      cmd('Firewalld', 'firewall-cmd --permanent --add-port=8080/tcp', 'Permanently open a raw TCP port.', ['sudo firewall-cmd --permanent --add-port=8080/tcp', 'sudo firewall-cmd --reload']),
      cmd('Sockets', 'ss -tulpn', 'Confirm which process is listening on a port.', ['sudo ss -tulpn']),
      cmd('Ubuntu firewall', 'ufw status verbose', 'Show Ubuntu UFW status and rules.', ['sudo ufw status verbose', 'sudo ufw allow OpenSSH'], {
        warnings: ['Enable UFW only after allowing SSH, or you may lock yourself out of a remote server.'],
      }),
    ],
    diagram: diagram('network', 'Firewall troubleshooting order', 'Interface, route, DNS, socket, firewall, application.'),
    mistakes: [
      'Opening a port without confirming the service listens on the expected address.',
      'Forgetting to reload after a permanent firewalld change.',
      'Enabling UFW on a remote host before allowing SSH.',
    ],
    troubleshooting: [
      trouble('A remote port is unreachable.', 'Check ss on the server, firewalld/UFW rules, the cloud security group and any upstream firewall.'),
      trouble('Firewalld changes vanish after reboot.', 'Use --permanent and reload; runtime-only rules are temporary.'),
    ],
  },
  {
    id: 'ubuntu-provisioning',
    courses: ['ubuntu'],
    topics: ['provisioning', 'cloud-init', 'ssh keys', 'first login', 'initial updates'],
    term: 'Provisioning and first login',
    definition:
      'Provisioning turns a base image into a usable server through cloud-init, SSH key injection, hostname configuration and initial package updates.',
    paragraphs: [
      'Cloud-init runs on first boot and can set the hostname, create users, install packages, write files and run commands. User data is processed once per instance; changes to user data after the first boot are not automatically reapplied. Use a repeatable configuration file rather than manual commands for anything that must be reproducible.',
      'SSH key authentication is safer than passwords. The public key goes in ~/.ssh/authorized_keys with mode 600, the private key stays on the client with mode 600, and the server should disable password authentication once key access is confirmed. Keep a second administrative path open while changing SSH configuration.',
      'After first login, update the package index, apply security updates, set the time zone, configure unattended upgrades if appropriate, and verify DNS and outbound connectivity. Record the instance identity and backup policy before deploying application code.',
    ],
    commands: [
      cmd('Provisioning', 'cloud-init status --long', 'Check whether cloud-init finished and inspect errors.', ['cloud-init status --long']),
      cmd('SSH', 'ssh-keygen -t ed25519 -C "you@example.com"', 'Generate an Ed25519 SSH key pair.', ['ssh-keygen -t ed25519 -C "you@example.com"'], {
        warnings: ['Protect the private key with a passphrase and never commit it to version control.'],
      }),
      cmd('SSH', 'ssh-copy-id user@server', 'Install your public key on a remote account.', ['ssh-copy-id deploy@203.0.113.10']),
      cmd('Updates', 'apt update && apt upgrade', 'Refresh metadata and apply available upgrades.', ['sudo apt update && sudo apt upgrade'], {
        warnings: ['Review the upgrade summary. A kernel update may require a reboot.'],
      }),
      cmd('Time', 'timedatectl set-timezone Asia/Kolkata', 'Set the system time zone.', ['sudo timedatectl set-timezone Asia/Kolkata', 'timedatectl status']),
      cmd('Identity', 'hostnamectl set-hostname app01', 'Set the persistent hostname.', ['sudo hostnamectl set-hostname app01']),
    ],
    diagram: diagram('pipeline', 'Server provisioning pipeline', 'Image, cloud-init, SSH access, updates, hardening, application deployment.'),
    mistakes: [
      'Disabling password authentication before confirming key-based login.',
      'Treating cloud-init user data as a configuration management system that runs on every boot.',
      'Leaving the default user or password enabled on an internet-facing host.',
    ],
    troubleshooting: [
      trouble('cloud-init did not apply the expected configuration.', 'Read /var/log/cloud-init.log and /var/log/cloud-init-output.log, and check whether the instance already consumed user data.'),
      trouble('SSH key login is rejected.', 'Check file ownership and modes, the server sshd configuration, and the auth log for the exact reason.'),
    ],
  },
  {
    id: 'ubuntu-hardening',
    courses: ['ubuntu'],
    topics: ['hardening ssh', 'ufw', 'fail2ban', 'security baseline', 'ssh'],
    term: 'SSH hardening, UFW and Fail2ban',
    definition:
      'A practical server baseline restricts remote access, limits exposed services, blocks brute-force attempts and keeps an audit trail.',
    paragraphs: [
      'SSH hardening starts with key-only authentication, a non-root administrative user, a changed or disabled root login, and a restricted AllowUsers or AllowGroups list. Validate the configuration with sshd -t and keep an existing session open while testing a new one.',
      'UFW is a simplified front end to netfilter. Default deny incoming, allow outgoing, and open only the services that must be reachable. Allow SSH before enabling UFW on a remote machine.',
      'Fail2ban watches logs and temporarily bans addresses that repeatedly fail authentication. It complements, but does not replace, key-only authentication and a firewall. Tune the ban time and ignore lists so you do not lock out monitoring or office networks.',
    ],
    commands: [
      cmd('SSH', 'sshd -t', 'Validate the SSH daemon configuration before restarting.', ['sudo sshd -t']),
      cmd('SSH', 'systemctl reload ssh', 'Reload SSH configuration without dropping existing sessions.', ['sudo systemctl reload ssh'], {
        warnings: ['Keep an active session open while testing a new SSH configuration.'],
      }),
      cmd('UFW', 'ufw default deny incoming', 'Set the default inbound policy to deny.', ['sudo ufw default deny incoming', 'sudo ufw default allow outgoing']),
      cmd('UFW', 'ufw allow OpenSSH', 'Allow the OpenSSH application profile.', ['sudo ufw allow OpenSSH']),
      cmd('UFW', 'ufw enable', 'Enable the firewall.', ['sudo ufw enable'], {
        warnings: ['Allow SSH first when connected remotely, or you will lose access.'],
      }),
      cmd('Fail2ban', 'fail2ban-client status sshd', 'Show the SSH jail status and banned addresses.', ['sudo fail2ban-client status sshd']),
      cmd('Logs', 'journalctl -u ssh -n 100', 'Inspect recent SSH authentication logs.', ['sudo journalctl -u ssh -n 100']),
    ],
    diagram: diagram('layers', 'Server security baseline', 'Network firewall, SSH policy, account policy, application controls, logging.'),
    mistakes: [
      'Enabling UFW before allowing SSH.',
      'Setting PermitRootLogin yes and relying only on a password.',
      'Installing Fail2ban and assuming it replaces key-based authentication.',
    ],
    troubleshooting: [
      trouble('You are locked out after an SSH change.', 'Use the provider console, restore the previous sshd configuration, and validate with sshd -t before reloading.'),
      trouble('Fail2ban does not ban anyone.', 'Check the jail log path, the backend, and whether the service can read the auth log.'),
    ],
  },
  {
    id: 'ubuntu-systemd-timers',
    courses: ['ubuntu', 'linux'],
    topics: ['systemd service', 'timer', 'schedule', 'cron', 'unit file'],
    term: 'systemd services and timers',
    definition:
      'A systemd service unit describes a process to run. A timer unit triggers a service on a calendar or monotonic schedule, replacing many cron use cases.',
    paragraphs: [
      'A service unit has [Unit], [Service] and [Install] sections. ExecStart is the command, User and Group control identity, WorkingDirectory sets the working directory, and Restart defines failure behaviour. Use systemctl daemon-reload after editing a unit file.',
      'A timer unit has OnCalendar or OnBootSec/OnUnitActiveSec. The corresponding service is usually named the same as the timer. Timers can be inspected with systemctl list-timers, which shows the next and last trigger.',
      'Prefer timers for system-level scheduled work because they integrate with journald, dependencies and failure handling. Cron is still useful for simple user jobs, but systemd gives better observability and control.',
    ],
    commands: [
      cmd('Services', 'systemctl daemon-reload', 'Reload unit files after editing them.', ['sudo systemctl daemon-reload']),
      cmd('Services', 'systemctl enable --now backup.service', 'Enable a service at boot and start it immediately.', ['sudo systemctl enable --now backup.service']),
      cmd('Timers', 'systemctl list-timers', 'List active timers with next and last trigger times.', ['systemctl list-timers --all']),
      cmd('Timers', 'systemctl status backup.timer', 'Inspect a timer and its trigger history.', ['systemctl status backup.timer']),
      cmd('Logs', 'journalctl -u backup.service -n 50', 'Read the last 50 log lines for a service.', ['journalctl -u backup.service -n 50']),
    ],
    code: [
      code(
        'ini',
        'Minimal systemd service and timer',
        `# /etc/systemd/system/backup.service
[Unit]
Description=Nightly application backup
After=network-online.target

[Service]
Type=oneshot
User=backup
WorkingDirectory=/srv/app
ExecStart=/usr/local/bin/backup.sh
Nice=10

# /etc/systemd/system/backup.timer
[Unit]
Description=Run the backup every night

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target`,
        ['Persistent=true runs a missed job after downtime.', 'Use systemctl enable --now backup.timer to activate the schedule.']
      ),
    ],
    diagram: diagram('flow', 'systemd timer lifecycle', 'Timer triggers service, service runs, logs to journald, next trigger is scheduled.'),
    mistakes: [
      'Forgetting systemctl daemon-reload after changing a unit file.',
      'Using a relative ExecStart path without setting WorkingDirectory.',
      'Scheduling overlapping jobs without a lock or oneshot semantics.',
    ],
    troubleshooting: [
      trouble('The timer is active but the service never runs.', 'Check systemctl list-timers, the OnCalendar expression, and journalctl for the timer and service.'),
      trouble('The service works manually but fails under systemd.', 'Check User, Environment, WorkingDirectory and PATH; systemd does not inherit your interactive shell environment.'),
    ],
  },
  {
    id: 'ubuntu-backups-monitoring',
    courses: ['ubuntu'],
    topics: ['backup', 'restic', 'monitoring', 'log rotation', 'upgrade', 'release upgrade'],
    term: 'Backups, monitoring and safe upgrades',
    definition:
      'A reliable server keeps restorable backups, observes health and capacity, rotates logs, and upgrades in a controlled, reversible way.',
    paragraphs: [
      'A backup is not a backup until you have restored from it. Use the 3-2-1 principle: three copies, two media types, one off-site. Restic provides encrypted, deduplicated, incremental backups to local or object storage. Schedule it, monitor failures, and test restores on a separate machine.',
      'Monitoring should cover availability, latency, errors, saturation and capacity. At minimum, watch disk space, memory, load, service health and certificate expiry. Logs are part of monitoring: configure logrotate so /var/log does not fill the disk, and ship important logs off-host when possible.',
      'For distribution upgrades, read the release notes, take a snapshot or backup, disable third-party repositories that may not have the new release, and run the upgrade tool in a maintenance window. Keep a rollback path and verify services after reboot.',
    ],
    commands: [
      cmd('Backups', 'restic init --repo /srv/backups/repo', 'Initialise an encrypted restic repository.', ['restic init --repo /srv/backups/repo'], {
        warnings: ['Store the repository password in a secure secret manager. Losing it makes the backup unrecoverable.'],
      }),
      cmd('Backups', 'restic backup /srv/app /etc', 'Back up application and configuration data.', ['restic -r /srv/backups/repo backup /srv/app /etc']),
      cmd('Backups', 'restic snapshots', 'List available snapshots.', ['restic -r /srv/backups/repo snapshots']),
      cmd('Backups', 'restic restore latest --target /restore', 'Restore the latest snapshot to a test directory.', ['restic -r /srv/backups/repo restore latest --target /restore'], {
        warnings: ['Restore to a separate path first and verify before overwriting production data.'],
      }),
      cmd('Monitoring', 'df -h', 'Show filesystem capacity and usage.', ['df -h', 'df -i']),
      cmd('Monitoring', 'journalctl --disk-usage', 'Show how much space the journal is using.', ['journalctl --disk-usage']),
      cmd('Logs', 'logrotate -d /etc/logrotate.conf', 'Dry-run log rotation and show what would happen.', ['sudo logrotate -d /etc/logrotate.conf']),
      cmd('Upgrades', 'do-release-upgrade', 'Start an Ubuntu release upgrade.', ['sudo do-release-upgrade'], {
        warnings: ['Take a backup or snapshot first. A release upgrade is a high-impact maintenance operation.'],
      }),
    ],
    diagram: diagram('pipeline', 'Backup and restore lifecycle', 'Schedule, snapshot, verify, store off-site, restore test, monitor.'),
    mistakes: [
      'Backing up only the database and not the configuration or uploads.',
      'Never testing a restore.',
      'Running a release upgrade without a snapshot or maintenance window.',
    ],
    troubleshooting: [
      trouble('The backup job succeeds but the repository is empty.', 'Check the paths passed to restic, exclusions, permissions and the snapshot list.'),
      trouble('The disk is full because of logs.', 'Check journalctl --disk-usage, /var/log sizes, logrotate configuration and deleted-but-open files with lsof.'),
    ],
  },
];
