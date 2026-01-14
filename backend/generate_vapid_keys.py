#!/usr/bin/env python3
"""
VAPID Key Generator for Web Push Notifications.

Run this script to generate VAPID keys for your application.
Add the generated keys to your .env file.

Usage:
    python generate_vapid_keys.py
"""
from py_vapid import Vapid
from cryptography.hazmat.backends import default_backend

def generate_vapid_keys():
    """Generate VAPID key pair for Web Push notifications."""
    print("Generating VAPID keys for Web Push Notifications...")
    print("=" * 60)

    try:
        # Generate VAPID keys with explicit backend
        vapid = Vapid()
        vapid.generate_keys(backend=default_backend())

        private_key = vapid.private_pem().decode('utf-8').strip()
        public_key = vapid.public_key.public_bytes_urlsafe_base64().decode('utf-8')

        print("\nVAPID Keys Generated Successfully!")
        print("=" * 60)
        print("\nAdd these to your .env file:\n")
        print(f"VAPID_PRIVATE_KEY={private_key}")
        print(f"VAPID_PUBLIC_KEY={public_key}")
        print("\n" + "=" * 60)
        print("\nIMPORTANT:")
        print("1. Keep the VAPID_PRIVATE_KEY secret and secure")
        print("2. Never commit the private key to version control")
        print("3. The public key will be shared with browsers")
        print("4. Once set, don't change these keys or existing subscriptions will break")
        print("=" * 60)
    except Exception as e:
        print(f"\nError generating VAPID keys: {e}")
        print("\nTrying alternative method...")

        # Alternative method using direct cryptography library
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        import base64

        # Generate private key
        private_key_obj = ec.generate_private_key(ec.SECP256R1(), default_backend())

        # Get private key in PEM format
        private_pem = private_key_obj.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8').strip()

        # Get public key in uncompressed format
        public_key_obj = private_key_obj.public_key()
        public_numbers = public_key_obj.public_numbers()

        # Convert to uncompressed point format (0x04 + x + y)
        x_bytes = public_numbers.x.to_bytes(32, byteorder='big')
        y_bytes = public_numbers.y.to_bytes(32, byteorder='big')
        uncompressed = b'\x04' + x_bytes + y_bytes

        # Base64 URL-safe encode
        public_key_b64 = base64.urlsafe_b64encode(uncompressed).decode('utf-8').rstrip('=')

        print("\nVAPID Keys Generated Successfully (Alternative Method)!")
        print("=" * 60)
        print("\nAdd these to your .env file:\n")
        print(f"VAPID_PRIVATE_KEY={private_pem}")
        print(f"VAPID_PUBLIC_KEY={public_key_b64}")
        print("\n" + "=" * 60)
        print("\nIMPORTANT:")
        print("1. Keep the VAPID_PRIVATE_KEY secret and secure")
        print("2. Never commit the private key to version control")
        print("3. The public key will be shared with browsers")
        print("4. Once set, don't change these keys or existing subscriptions will break")
        print("=" * 60)

if __name__ == "__main__":
    generate_vapid_keys()
