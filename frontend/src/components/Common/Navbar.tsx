import { Flex, Image, useBreakpointValue } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"

import Logo from "/assets/images/rsc-x-logo.png"
import { ColorModeButton } from "../ui/color-mode"
import NotificationsMenu from "./NotificationsMenu"
import UserMenu from "./UserMenu"

function Navbar() {
  const display = useBreakpointValue({ base: "none", md: "flex" })

  return (
    <Flex
      display={display}
      justify="space-between"
      position="sticky"
      color="white"
      align="center"
      bg="bg.muted"
      w="100%"
      top={0}
      p={4}
    >
      <Link to="/">
        <Image src={Logo} alt="rsc-xchange logo" w="180px" maxW="2xs" px={2} />
      </Link>
      <Flex gap={2} alignItems="center">
        <ColorModeButton />
        <NotificationsMenu />
        <UserMenu />
      </Flex>
    </Flex>
  )
}

export default Navbar
